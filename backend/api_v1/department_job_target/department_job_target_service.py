from collections import defaultdict
from datetime import date, datetime, timezone
from typing import List, Optional

from fastapi import status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.app_setting.app_setting_service import (
    get_bool_setting,
    get_effective_bool_setting,
    HEADCOUNT_PLAN_ENABLED_KEY,
    HEADCOUNT_FACT_HUMANS_ONLY_KEY,
)
from backend.api_v1.department.department_messages import DepartmentNotFound
from backend.api_v1.department.department_repository import DepartmentRepository
from backend.api_v1.department_job_target.department_job_target_repository import (
    DepartmentJobTargetRepository,
)
from backend.api_v1.department_job_target.department_job_target_schema import (
    DepartmentJobTarget as DepartmentJobTargetSchema,
    DepartmentJobTargetCreate,
    DepartmentJobTargetUpdate,
    FactEmployee,
    HeadcountCalcRow,
    OrganigramJob,
    OrganigramNode,
    TargetCountByLink,
)
from backend.api_v1.department_job_target.department_job_target_messages import (
    DepartmentJobTargetNotFound,
    DepartmentJobTargetAlreadyExists,
    DepartmentJobTargetTypeMismatch,
    DepartmentJobTargetDeleteError,
    DepartmentJobTargetCreateSuccess,
    DepartmentJobTargetUpdateSuccess,
    DepartmentJobTargetDeleteSuccess,
)
from backend.api_v1.department_type_job_link.department_type_job_link_messages import (
    DepartmentTypeJobLinkNotFound,
)
from backend.api_v1.department_type_job_link.department_type_job_link_repository import (
    DepartmentTypeJobLinkRepository,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_origin.employee_origin_model import HUMAN_ORIGIN_ID
from backend.api_v1.employee_status.employee_status_model import EmployeeStatus

# Employee status NAME that marks an employee as counted in the fact
# (mirrors planning/plan_report_repository.py).
WORKING_EMPLOYEE_STATUS_NAME = "working"


class DepartmentJobTargetService(BaseService):
    def __init__(
        self,
        repository: DepartmentJobTargetRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    # ------------------------------------------------------------------
    # Feature gate + HRM scope
    # ------------------------------------------------------------------

    async def ensure_feature_enabled(self) -> None:
        """Router-level gate: 403 while the headcount-plan switch is off."""
        if not await get_bool_setting(
            self.session, HEADCOUNT_PLAN_ENABLED_KEY, default=False
        ):
            await self._raise_error(
                "departmentJobTargetFeatureDisabled",
                status_code=status.HTTP_403_FORBIDDEN,
                fallback="Headcount planning is disabled.",
            )

    async def _resolve_allowed_department_ids(self) -> Optional[set[int]]:
        """
        Departments the current user may plan for:
          - bypass (admin / HRS / dev) -> None (all departments)
          - HRM                        -> ACTIVE scope roots + all descendants
          - neither                    -> empty set (none)
        Mirrors EmployeeService._resolve_visible_main_department_ids.
        """
        from backend.api_v1.hrm_scope.hrm_scope_constants import has_bypass, is_hrm
        from backend.api_v1.hrm_scope.hrm_scope_repository import HrmScopeRepository

        if self.user is None:
            return None
        groups = getattr(self.user, "groups", []) or []
        if has_bypass(groups):
            return None
        if not is_hrm(groups):
            return set()

        hrm_repo = HrmScopeRepository(session=self.repository.session)
        roots = await hrm_repo.get_active_scope_department_ids(
            self.user.id, date.today()
        )
        if not roots:
            return set()
        dept_repo = DepartmentRepository(session=self.repository.session)
        return await dept_repo.get_subtree_ids(roots)

    async def _ensure_department_allowed(self, department_id: int) -> None:
        allowed = await self._resolve_allowed_department_ids()
        if allowed is None or department_id in allowed:
            return
        await self._raise_error(
            "departmentJobTargetDepartmentNotAllowed",
            status_code=status.HTTP_403_FORBIDDEN,
            fallback="This department is outside your scope.",
        )

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    @staticmethod
    def _schema_from_record(record) -> DepartmentJobTargetSchema:
        schema = DepartmentJobTargetSchema.model_validate(record)
        schema.created_by_name = record.author.name if record.author else None
        return schema

    async def get_targets(
        self, department_id: int, link_id: Optional[int] = None
    ) -> List[DepartmentJobTargetSchema]:
        await self._ensure_department_allowed(department_id)
        records = await self.repository.get_targets(department_id, link_id)
        return [self._schema_from_record(r) for r in records]

    async def count_by_link(self, link_id: int) -> TargetCountByLink:
        return TargetCountByLink(count=await self.repository.count_by_link(link_id))

    async def calculate(
        self, department_id: int, on_date: date
    ) -> List[HeadcountCalcRow]:
        """Plan-vs-fact rows for every job linked to the department's type."""
        await self._ensure_department_allowed(department_id)

        dept_repo = DepartmentRepository(session=self.repository.session)
        department = await dept_repo.get_by_id(department_id)
        if not department:
            raise await self._resolve_domain_error(DepartmentNotFound(department_id))

        link_repo = DepartmentTypeJobLinkRepository(session=self.repository.session)
        job_rows = await link_repo.get_jobs_by_department_type(
            department_type_id=department.department_type_id,
            is_active=None,
        )
        plan_by_link = await self.repository.get_plan_as_of(department_id, on_date)
        fact_by_job = await self._compute_fact_counts(department_id, on_date)

        rows = [
            HeadcountCalcRow(
                link_id=link_id,
                job_id=job.id,
                job_name=job.name,
                link_is_active=link_is_active,
                plan_qty=plan_by_link.get(link_id, 0),
                has_plan=link_id in plan_by_link,
                fact_qty=fact_by_job.get(job.id, (0, 0))[0],
                fact_pending_qty=fact_by_job.get(job.id, (0, 0))[1],
            )
            for job, link_id, link_is_active in job_rows
        ]
        rows.sort(key=lambda r: r.job_name.lower())
        return rows

    async def _get_candidate_change_rows(
        self, department_ids: set[int], on_date: date
    ) -> list[tuple]:
        """Flattened change rows for every employee whose state COULD place
        them in one of these departments (applied + ready events due by the
        date, in replay order)."""
        candidate_ids = await self.repository.get_candidate_employee_ids(
            department_ids
        )
        if not candidate_ids:
            return []
        humans_only = await get_effective_bool_setting(
            self.session, HEADCOUNT_FACT_HUMANS_ONLY_KEY, default=True
        )
        return await self.repository.get_event_change_rows(
            candidate_ids,
            on_date,
            humans_only=humans_only,
            human_origin_id=HUMAN_ORIGIN_ID,
        )

    @staticmethod
    def _fold_change_rows(
        change_rows: list[tuple], only_applied: bool = False
    ) -> dict[int, dict[str, Optional[int]]]:
        """
        Fold change rows into an as-of state per employee (job / status / main
        dept); the rows arrive pre-ordered, the last change of each direction
        wins. Mirrors EmployeeEventService._reproject_employee_projection.

        Each determinant carries a ``*_pending`` flag: True when the LAST event
        that set it is still ``ready`` (not applied). ``only_applied=True``
        skips ready events entirely — the CONFIRMED state before any pending
        move.
        """
        state: dict[int, dict[str, Optional[int]]] = defaultdict(
            lambda: {
                "job": None,
                "status": None,
                "dept": None,
                "job_pending": False,
                "status_pending": False,
                "dept_pending": False,
            }
        )
        for (
            employee_id,
            _effective_date,
            _event_id,
            event_status_name,
            direction_code,
            new_job_id,
            new_status_id,
            new_department_id,
        ) in change_rows:
            pending = event_status_name != "applied"
            if only_applied and pending:
                continue
            st = state[employee_id]
            if direction_code == "JOB_CHANGE" and new_job_id is not None:
                st["job"] = new_job_id
                st["job_pending"] = pending
            elif direction_code == "STATUS_CHANGE" and new_status_id is not None:
                st["status"] = new_status_id
                st["status_pending"] = pending
            elif direction_code == "MAIN_DEPT_CHANGE" and new_department_id is not None:
                st["dept"] = new_department_id
                st["dept_pending"] = pending
        return state

    async def _replay_employee_states(
        self, department_ids: set[int], on_date: date
    ) -> dict[int, dict[str, Optional[int]]]:
        """As-of state per candidate employee, replayed from applied + ready
        events (drafts ignored) — future dates already reflect approved
        transfers/leaves."""
        rows = await self._get_candidate_change_rows(department_ids, on_date)
        return self._fold_change_rows(rows)

    async def _working_status_id(self) -> Optional[int]:
        return (
            await self.session.execute(
                select(EmployeeStatus.id).where(
                    EmployeeStatus.name == WORKING_EMPLOYEE_STATUS_NAME
                )
            )
        ).scalar_one_or_none()

    def _is_fact(
        self,
        st: dict[str, Optional[int]],
        department_id: int,
        working_status_id: int,
    ) -> bool:
        return (
            st["dept"] == department_id  # exact instance, no tree rollup
            and st["status"] == working_status_id
            and st["job"] is not None
        )

    @staticmethod
    def _is_pending(st: dict[str, Optional[int]]) -> bool:
        """A counted placement is provisional when any of its three
        determinants (job / status / dept) was set by a not-yet-applied
        (ready) event."""
        return bool(
            st["job_pending"] or st["status_pending"] or st["dept_pending"]
        )

    async def _compute_fact_counts(
        self, department_id: int, on_date: date
    ) -> dict[int, tuple[int, int]]:
        """Per job in this department INSTANCE as of a date: (total working
        headcount, of which provisional — resting on a ready event)."""
        working_status_id = await self._working_status_id()
        if working_status_id is None:
            return {}
        state = await self._replay_employee_states({department_id}, on_date)
        total: dict[int, int] = defaultdict(int)
        pending: dict[int, int] = defaultdict(int)
        for st in state.values():
            if self._is_fact(st, department_id, working_status_id):
                total[st["job"]] += 1
                if self._is_pending(st):
                    pending[st["job"]] += 1
        return {job_id: (n, pending.get(job_id, 0)) for job_id, n in total.items()}

    async def get_fact_employees(
        self, department_id: int, on_date: date, job_id: int
    ) -> List[FactEmployee]:
        """The employees behind one fact qty: as-of state matches the row."""
        await self._ensure_department_allowed(department_id)
        working_status_id = await self._working_status_id()
        if working_status_id is None:
            return []
        state = await self._replay_employee_states({department_id}, on_date)
        pending_by_id = {
            emp_id: self._is_pending(st)
            for emp_id, st in state.items()
            if self._is_fact(st, department_id, working_status_id)
            and st["job"] == job_id
        }
        if not pending_by_id:
            return []
        from backend.api_v1.employee.employee_model import Employee

        rows = (
            await self.session.execute(
                select(Employee.id, Employee.code, Employee.name)
                .where(Employee.id.in_(list(pending_by_id.keys())))
                .order_by(Employee.name)
            )
        ).all()
        return [
            FactEmployee(
                id=r.id,
                code=r.code,
                name=r.name,
                is_pending=pending_by_id.get(r.id, False),
            )
            for r in rows
        ]

    async def get_organigram(
        self, department_id: int, on_date: date
    ) -> OrganigramNode:
        """
        Top-down organigram of the department SUBTREE as of a date: every
        active descendant department, its occupied jobs, and the working
        employees holding each job (same as-of replay as the fact counts,
        done ONCE for the whole subtree).
        """
        await self._ensure_department_allowed(department_id)

        from backend.api_v1.department.department_model import Department
        from backend.api_v1.department_category.department_category_model import (
            DepartmentCategory,
        )
        from backend.api_v1.department_type.department_type_model import (
            DepartmentType,
        )
        from backend.api_v1.employee.employee_model import Employee
        from backend.api_v1.job.job_model import Job

        dept_repo = DepartmentRepository(session=self.repository.session)
        root = await dept_repo.get_by_id(department_id)
        if not root:
            raise await self._resolve_domain_error(DepartmentNotFound(department_id))

        from backend.api_v1.department_type_job_link.department_type_job_link_model import (
            DepartmentTypeJobLink,
        )

        subtree_ids = await dept_repo.get_subtree_ids({department_id})
        dept_rows = (
            await self.session.execute(
                select(
                    Department.id,
                    Department.name,
                    Department.parent_id,
                    Department.is_active,
                    Department.department_type_id,
                    DepartmentType.name.label("type_name"),
                    DepartmentCategory.key.label("category_key"),
                )
                .join(
                    DepartmentType,
                    DepartmentType.id == Department.department_type_id,
                    isouter=True,
                )
                .join(
                    DepartmentCategory,
                    DepartmentCategory.id == Department.department_category_id,
                    isouter=True,
                )
                .where(Department.id.in_(subtree_ids))
            )
        ).all()

        # Every job linked to any department TYPE present in the subtree —
        # vacant jobs render too (they are valid drop targets and carry a plan).
        type_ids = {r.department_type_id for r in dept_rows if r.department_type_id}
        link_rows = (
            (
                await self.session.execute(
                    select(
                        DepartmentTypeJobLink.department_type_id,
                        DepartmentTypeJobLink.id,
                        DepartmentTypeJobLink.is_active,
                        Job.id.label("job_id"),
                        Job.name.label("job_name"),
                    )
                    .join(Job, Job.id == DepartmentTypeJobLink.job_id)
                    .where(DepartmentTypeJobLink.department_type_id.in_(type_ids))
                )
            ).all()
            if type_ids
            else []
        )
        links_by_type: dict[int, list] = defaultdict(list)
        link_by_type_job: dict[tuple[int, int], int] = {}
        for lr in link_rows:
            links_by_type[lr.department_type_id].append(lr)
            link_by_type_job[(lr.department_type_id, lr.job_id)] = lr.id

        # Plan qty per (department, link) as of the date — one query.
        plan_map = await self.repository.get_plan_as_of_multi(subtree_ids, on_date)

        # One replay for the entire subtree, folded twice:
        #  - full (applied + ready)  -> the provisional as-of placement;
        #  - applied-only            -> the confirmed placement.
        # A pending (ready-event) move shows the employee GHOSTED at the
        # provisional spot AND normally at the confirmed spot; only the
        # provisional placement is counted in fact (matches the calc grid).
        # Entries: (emp_id, is_pending, counted).
        placements: dict[int, dict[int, list[tuple[int, bool, bool]]]] = defaultdict(
            lambda: defaultdict(list)
        )
        working_status_id = await self._working_status_id()
        if working_status_id is not None:
            rows = await self._get_candidate_change_rows(subtree_ids, on_date)
            full_state = self._fold_change_rows(rows)
            applied_state = self._fold_change_rows(rows, only_applied=True)

            def _placement(st) -> Optional[tuple[int, int]]:
                if (
                    st is not None
                    and st["status"] == working_status_id
                    and st["job"] is not None
                    and st["dept"] in subtree_ids
                ):
                    return (st["dept"], st["job"])
                return None

            for emp_id, st in full_state.items():
                prov = _placement(st)
                pending = self._is_pending(st)
                if prov is not None:
                    placements[prov[0]][prov[1]].append((emp_id, pending, True))
                if pending:
                    conf = _placement(applied_state.get(emp_id))
                    if conf is not None and conf != prov:
                        placements[conf[0]][conf[1]].append((emp_id, False, False))

        emp_ids = {
            e
            for by_job in placements.values()
            for emps in by_job.values()
            for e, _, _ in emps
        }
        # Employees with ANY open (draft/ready) event — regardless of its
        # effective date. The backend rejects a second event while one is
        # open, so the FE disables dragging them.
        open_event_emp_ids: set[int] = set()
        if emp_ids:
            from backend.api_v1.employee_events.employee_event.employee_event_model import (
                EmployeeEvent,
            )
            from backend.api_v1.employee_events.employee_event_status.employee_event_status_model import (
                EmployeeEventStatus,
            )

            open_event_emp_ids = set(
                (
                    await self.session.execute(
                        select(EmployeeEvent.employee_id)
                        .join(
                            EmployeeEventStatus,
                            EmployeeEventStatus.id == EmployeeEvent.status_id,
                        )
                        .where(
                            EmployeeEvent.employee_id.in_(emp_ids),
                            EmployeeEventStatus.name.in_(("draft", "ready")),
                        )
                    )
                )
                .scalars()
                .all()
            )
        occupied_job_ids = {j for by_job in placements.values() for j in by_job}
        emp_by_id = {
            r.id: r
            for r in (
                await self.session.execute(
                    select(Employee.id, Employee.code, Employee.name).where(
                        Employee.id.in_(emp_ids)
                    )
                )
            ).all()
        } if emp_ids else {}
        job_name_by_id = {lr.job_id: lr.job_name for lr in link_rows}
        missing_job_ids = occupied_job_ids - set(job_name_by_id)
        if missing_job_ids:
            job_name_by_id.update(
                dict(
                    (
                        await self.session.execute(
                            select(Job.id, Job.name).where(Job.id.in_(missing_job_ids))
                        )
                    ).all()
                )
            )

        def jobs_of(dept_id: int, type_id: Optional[int]) -> list[OrganigramJob]:
            # Active-link jobs (vacant included) plus any occupied job.
            job_ids = {
                lr.job_id for lr in links_by_type.get(type_id, []) if lr.is_active
            } | set(placements.get(dept_id, {}).keys())
            jobs = []
            for job_id in job_ids:
                link_id = (
                    link_by_type_job.get((type_id, job_id)) if type_id else None
                )
                entries = placements.get(dept_id, {}).get(job_id, [])
                jobs.append(
                    OrganigramJob(
                        job_id=job_id,
                        job_name=job_name_by_id.get(job_id, str(job_id)),
                        plan_qty=(
                            plan_map.get((dept_id, link_id), 0)
                            if link_id is not None
                            else 0
                        ),
                        fact_qty=sum(1 for _, _, counted in entries if counted),
                        employees=sorted(
                            (
                                FactEmployee(
                                    id=e.id,
                                    code=e.code,
                                    name=e.name,
                                    is_pending=pending,
                                    has_open_event=emp_id in open_event_emp_ids,
                                )
                                for emp_id, pending, _ in entries
                                if (e := emp_by_id.get(emp_id)) is not None
                            ),
                            key=lambda e: e.name.lower(),
                        ),
                    )
                )
            jobs.sort(key=lambda j: j.job_name.lower())
            return jobs

        # Assemble the recursive tree from parent_id (root kept even if
        # inactive; inactive descendants are dropped).
        node_by_id = {
            r.id: OrganigramNode(
                department_id=r.id,
                department_name=r.name,
                department_type_id=r.department_type_id,
                department_type_name=r.type_name,
                department_category_key=r.category_key,
                jobs=jobs_of(r.id, r.department_type_id),
                children=[],
            )
            for r in dept_rows
            if r.is_active or r.id == department_id
        }
        for r in dept_rows:
            if r.id == department_id or r.id not in node_by_id:
                continue
            parent = node_by_id.get(r.parent_id)
            if parent is not None:
                parent.children.append(node_by_id[r.id])
        for node in node_by_id.values():
            node.children.sort(key=lambda n: n.department_name.lower())
        return node_by_id[department_id]

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    async def create_target(
        self, target_in: DepartmentJobTargetCreate
    ) -> MutationResponse[DepartmentJobTargetSchema]:
        await self._ensure_department_allowed(target_in.department_id)

        dept_repo = DepartmentRepository(session=self.repository.session)
        department = await dept_repo.get_by_id(target_in.department_id)
        if not department:
            raise await self._resolve_domain_error(
                DepartmentNotFound(target_in.department_id)
            )

        link_repo = DepartmentTypeJobLinkRepository(session=self.repository.session)
        link = await link_repo.get_by_id(target_in.department_type_job_link_id)
        if not link:
            raise await self._resolve_domain_error(
                DepartmentTypeJobLinkNotFound(target_in.department_type_job_link_id)
            )
        if link.department_type_id != department.department_type_id:
            raise await self._resolve_domain_error(
                DepartmentJobTargetTypeMismatch(
                    department.name,
                    link.job.name if link.job else str(link.job_id),
                )
            )

        existing = await self.repository.get_by_dept_link_date(
            target_in.department_id,
            target_in.department_type_job_link_id,
            target_in.effective_date,
        )
        if existing:
            raise await self._resolve_domain_error(
                DepartmentJobTargetAlreadyExists(str(target_in.effective_date))
            )

        try:
            record = await self.repository.create_from_dict(
                {
                    **target_in.model_dump(),
                    "created_by": self.user.id if self.user else None,
                }
            )
        except IntegrityError:
            raise await self._resolve_domain_error(
                DepartmentJobTargetAlreadyExists(str(target_in.effective_date))
            )
        schema = DepartmentJobTargetSchema.model_validate(record)
        schema.created_by_name = self.user.name if self.user else None
        job_name = link.job.name if link.job else str(link.job_id)
        detail = await self._resolve_domain_success(
            DepartmentJobTargetCreateSuccess(
                f"{job_name} — {target_in.effective_date}"
            )
        )
        return MutationResponse(detail=detail, data=schema)

    async def update_target(
        self, target_id: int, target_update: DepartmentJobTargetUpdate
    ) -> MutationResponse[DepartmentJobTargetSchema]:
        record = await self.repository.get_by_id(target_id)
        if not record:
            raise await self._resolve_domain_error(
                DepartmentJobTargetNotFound(target_id)
            )
        await self._ensure_department_allowed(record.department_id)

        # Moving the entry to a date that already has a target for this
        # department + job would violate the unique triple — reject it with the
        # same translated "already exists" message the create path uses.
        if target_update.effective_date != record.effective_date:
            clash = await self.repository.get_by_dept_link_date(
                record.department_id,
                record.department_type_job_link_id,
                target_update.effective_date,
            )
            if clash and clash.id != record.id:
                raise await self._resolve_domain_error(
                    DepartmentJobTargetAlreadyExists(str(target_update.effective_date))
                )

        # The row keeps answering "who set this qty and when".
        record.qty = target_update.qty
        record.effective_date = target_update.effective_date
        record.created_by = self.user.id if self.user else None
        record.created_at = datetime.now(timezone.utc)
        try:
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()
            raise await self._resolve_domain_error(
                DepartmentJobTargetAlreadyExists(str(target_update.effective_date))
            )

        schema = DepartmentJobTargetSchema.model_validate(record)
        schema.created_by_name = self.user.name if self.user else None
        job = record.link.job if record.link else None
        label = f"{job.name if job else record.department_type_job_link_id} — {record.effective_date}"
        detail = await self._resolve_domain_success(
            DepartmentJobTargetUpdateSuccess(label)
        )
        return MutationResponse(detail=detail, data=schema)

    async def delete_target(self, target_id: int) -> None:
        record = await self.repository.get_by_id(target_id)
        if not record:
            raise await self._resolve_domain_error(
                DepartmentJobTargetNotFound(target_id)
            )
        await self._ensure_department_allowed(record.department_id)
        job = record.link.job if record.link else None
        label = f"{job.name if job else record.department_type_job_link_id} — {record.effective_date}"
        await self.delete_by_id(
            target_id,
            name=label,
            delete_error_exc=DepartmentJobTargetDeleteError,
            delete_success_exc=DepartmentJobTargetDeleteSuccess,
        )
