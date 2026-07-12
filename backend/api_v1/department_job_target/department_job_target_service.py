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

    async def _replay_employee_states(
        self, department_id: int, on_date: date
    ) -> dict[int, dict[str, Optional[int]]]:
        """
        As-of state per candidate employee (job / status / main dept), replayed
        from applied + ready events (drafts ignored) — so future dates already
        reflect approved transfers/leaves. Bulk queries, Python fold; mirrors
        EmployeeEventService._reproject_employee_projection semantics.

        Each of the three determinants also carries a ``*_pending`` flag: True
        when the LAST event that set it is still ``ready`` (not yet applied), so
        the caller can distinguish confirmed from provisional placements.
        """
        candidate_ids = await self.repository.get_candidate_employee_ids(
            department_id
        )
        if not candidate_ids:
            return {}

        humans_only = await get_effective_bool_setting(
            self.session, HEADCOUNT_FACT_HUMANS_ONLY_KEY, default=True
        )
        change_rows = await self.repository.get_event_change_rows(
            candidate_ids,
            on_date,
            humans_only=humans_only,
            human_origin_id=HUMAN_ORIGIN_ID,
        )

        # Fold per employee in (effective_date, event_id) order — the rows
        # arrive pre-ordered; the last change of each direction wins.
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
            st = state[employee_id]
            pending = event_status_name != "applied"
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
        state = await self._replay_employee_states(department_id, on_date)
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
        state = await self._replay_employee_states(department_id, on_date)
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

        # The row keeps answering "who set this qty and when".
        record.qty = target_update.qty
        record.created_by = self.user.id if self.user else None
        record.created_at = datetime.now(timezone.utc)
        await self.session.commit()

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
