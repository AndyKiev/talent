from typing import Optional, List

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.utils.enums import (
    PlanSessionStatusKey,
    PLAN_SESSION_ACTIVE_STATUS_KEYS,
)

from backend.api_v1.department.department_model import Department
from backend.api_v1.job.job_model import Job
from backend.api_v1.job_job_group_link.job_job_group_link_model import JobJobGroupLink
from backend.api_v1.department_type_job_link.department_type_job_link_model import (
    DepartmentTypeJobLink,
)

from backend.api_v1.planning.plan_session.plan_session_repository import (
    PlanSessionRepository,
)
from backend.api_v1.planning.plan_session.plan_session_schema import (
    PlanSession as PlanSessionSchema,
    PlanSessionCreate,
    PlanSessionUpdate,
)
from backend.api_v1.planning.plan_session.plan_session_errors import (
    PlanSessionNotFound,
    PlanSessionNameTaken,
    PlanSessionPeriodOverlap,
    PlanSessionPendingExists,
    PlanSessionActiveLimit,
    PlanSessionRevertBlocked,
    PlanSessionNotClosed,
    PlanSessionDeleteError,
    PlanSessionNoMatchingScopes,
)
from backend.api_v1.planning.plan_session.plan_session_success import (
    PlanSessionCreateSuccess,
    PlanSessionUpdateSuccess,
    PlanSessionDeleteSuccess,
    PlanSessionOpenSuccess,
    PlanSessionCloseSuccess,
    PlanSessionRevertSuccess,
)

from backend.api_v1.planning.plan_session_status.plan_session_status_repository import (
    PlanSessionStatusRepository,
)
from backend.api_v1.planning.plan_session_status.plan_session_status_errors import (
    PlanSessionStatusNotFoundByKey,
)
from backend.api_v1.planning.plan_category_default.plan_category_default_repository import (
    PlanCategoryDefaultRepository,
)
from backend.api_v1.planning.plan_scope_default.plan_scope_default_repository import (
    PlanScopeDefaultRepository,
)
from backend.api_v1.planning.plan_session_category.plan_session_category_model import (
    PlanSessionCategory,
)
from backend.api_v1.planning.plan_scope.plan_scope_model import PlanScope


class PlanSessionService(BaseService):
    def __init__(
        self,
        repository: PlanSessionRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)
        # Sibling repositories sharing the same AsyncSession
        self.status_repo = PlanSessionStatusRepository(session=session)
        self.category_default_repo = PlanCategoryDefaultRepository(session=session)
        self.scope_default_repo = PlanScopeDefaultRepository(session=session)

    # ------------------------------------------------------------------
    # Reads
    # ------------------------------------------------------------------
    async def get_by_id(self, id: int) -> PlanSessionSchema:
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(PlanSessionNotFound(id))
        return result

    async def get_plan_sessions(self) -> List[PlanSessionSchema]:
        records = await self.repository.get_all_ordered()
        return [PlanSessionSchema.model_validate(r) for r in records]

    async def get_status_id_by_key(self, key: str) -> int:
        status_id = await self.status_repo.get_id_by_field("key", key)
        if status_id is None:
            raise await self._resolve_domain_error(
                PlanSessionStatusNotFoundByKey(key)
            )
        return status_id

    async def _get_with_status(self, session_id: int):
        """Re-load a session with its `status` relationship eager-loaded, so
        model_validate (which reads `status` / derived `is_active`) never
        triggers an async lazy-load after a commit has expired the instance."""
        return (
            await self.session.execute(
                select(self.repository.model)
                .where(self.repository.model.id == session_id)
                .options(selectinload(self.repository.model.status))
            )
        ).scalar_one()

    # ------------------------------------------------------------------
    # Validations
    # ------------------------------------------------------------------
    async def _assert_no_overlap(
        self, start_date, end_date, exclude_id: int | None = None
    ) -> None:
        conflicts = await self.repository.get_overlapping(
            start_date, end_date, exclude_id=exclude_id
        )
        if conflicts:
            raise await self._resolve_domain_error(
                PlanSessionPeriodOverlap(conflicts[0].name)
            )

    async def _assert_pending_capacity(self) -> None:
        pending = await self.repository.count_by_status_keys(
            [PlanSessionStatusKey.PENDING.value]
        )
        if pending >= 1:
            raise await self._resolve_domain_error(PlanSessionPendingExists())

    async def _assert_active_capacity(self, adding: int = 1) -> None:
        active = await self.repository.count_by_status_keys(
            list(PLAN_SESSION_ACTIVE_STATUS_KEYS)
        )
        if active + adding > 2:
            raise await self._resolve_domain_error(PlanSessionActiveLimit())

    # ------------------------------------------------------------------
    # Creation + snapshot orchestration
    # ------------------------------------------------------------------
    async def create_plan_session(
        self, data: PlanSessionCreate
    ) -> MutationResponse[PlanSessionSchema]:
        await self.exists_by_name(data.name, already_exists_exc=PlanSessionNameTaken)
        await self._assert_no_overlap(data.start_date, data.end_date)
        await self._assert_pending_capacity()
        await self._assert_active_capacity(adding=1)

        pending_status_id = await self.get_status_id_by_key(
            PlanSessionStatusKey.PENDING.value
        )

        # Build the session instance (no commit yet)
        session_row = self.repository.model(
            name=data.name,
            description=data.description,
            start_date=data.start_date,
            end_date=data.end_date,
            plan_session_status_id=pending_status_id,
        )
        self.session.add(session_row)
        await self.session.flush()  # assign session_row.id without committing

        # 1) Snapshot categories from defaults
        category_defaults = await self.category_default_repo.get_all(sort="id")
        category_ids = [d.department_category_id for d in category_defaults]
        for cat_id in category_ids:
            self.session.add(
                PlanSessionCategory(
                    plan_session_id=session_row.id,
                    department_category_id=cat_id,
                )
            )

        # 2) Resolve config-category departments (active). These are the ONLY
        #    departments that get plan rows. Coverage is checked across each
        #    one's whole instance subtree (descendants by parent_id).
        config_departments: list[int] = []  # department ids
        if category_ids:
            dept_stmt = (
                select(Department.id)
                .where(
                    Department.department_category_id.in_(category_ids),
                    Department.is_active.is_(True),
                )
                .order_by(Department.id)
            )
            config_departments = list((await self.session.scalars(dept_stmt)).all())

        # 2a) Load the full active department-instance tree (id, parent_id, type)
        #     so we can walk each config department's subtree in memory.
        tree_stmt = select(
            Department.id,
            Department.parent_id,
            Department.department_type_id,
        ).where(Department.is_active.is_(True))
        children_by_parent: dict[int, list[int]] = {}
        type_by_dept: dict[int, int] = {}
        for did, pid, tid in (await self.session.execute(tree_stmt)).all():
            type_by_dept[did] = tid
            if pid is not None:
                children_by_parent.setdefault(pid, []).append(did)

        def subtree_dept_ids(root_id: int) -> list[int]:
            """root_id plus all its active descendant department INSTANCES."""
            seen: set[int] = set()
            order: list[int] = []
            stack = [root_id]
            while stack:
                cur = stack.pop()
                if cur in seen:
                    continue
                seen.add(cur)
                order.append(cur)
                stack.extend(children_by_parent.get(cur, []))
            return order

        # 3) Scope defaults
        scope_default_rows = await self.scope_default_repo.get_all(sort="id")
        # Snapshot to plain tuples NOW — these must survive a later rollback
        # (which expires ORM instances and would trigger async lazy-loads).
        scope_defaults: list[tuple[int, int | None]] = [
            (sd.job_group_id, sd.talent_status_id) for sd in scope_default_rows
        ]
        scope_job_group_ids = {jg for jg, _ in scope_defaults}

        # 3a) For each scope-default job group: its set of ACTIVE job ids.
        #     A group with no active jobs can never match a department.
        group_active_jobs: dict[int, set[int]] = {gid: set() for gid in scope_job_group_ids}
        if scope_job_group_ids:
            jjg_stmt = (
                select(JobJobGroupLink.job_group_id, JobJobGroupLink.job_id)
                .join(Job, Job.id == JobJobGroupLink.job_id)
                .where(
                    JobJobGroupLink.job_group_id.in_(scope_job_group_ids),
                    Job.is_active.is_(True),
                )
            )
            for gid, jid in (await self.session.execute(jjg_stmt)).all():
                group_active_jobs[gid].add(jid)

        # 3b) Active department_type_job_link → {type_id: {job_id, ...}} for every
        #     job linked (active link, active job) to that department type.
        #     The link is type-level (its global source of truth), but we apply it
        #     per-instance below: an instance "holds" a job iff the job is linked to
        #     that instance's department_type_id.
        type_jobs: dict[int, set[int]] = {}
        dtl_stmt = (
            select(
                DepartmentTypeJobLink.department_type_id,
                DepartmentTypeJobLink.job_id,
            )
            .join(Job, Job.id == DepartmentTypeJobLink.job_id)
            .where(
                DepartmentTypeJobLink.is_active.is_(True),
                Job.is_active.is_(True),
            )
        )
        for tid, jid in (await self.session.execute(dtl_stmt)).all():
            type_jobs.setdefault(tid, set()).add(jid)

        def instance_holds_job(dept_instance_id: int, job_id: int) -> bool:
            """Instance holds job iff job is linked to the instance's own type."""
            tid = type_by_dept.get(dept_instance_id)
            if tid is None:
                return False
            return job_id in type_jobs.get(tid, set())

        # 3c) Per config department: a job is "covered" if SOME instance in its
        #     subtree (itself or any recursive descendant via parent_id) holds it.
        #     A group matches iff EVERY active job in the group is covered.
        def covered_jobs_for(config_dept_id: int, job_ids: set[int]) -> set[int]:
            subtree = subtree_dept_ids(config_dept_id)
            covered: set[int] = set()
            for jid in job_ids:
                for inst_id in subtree:
                    if instance_holds_job(inst_id, jid):
                        covered.add(jid)
                        break
            return covered

        def group_matches_department(job_group_id: int, config_dept_id: int) -> bool:
            group_jobs = group_active_jobs.get(job_group_id, set())
            if not group_jobs:
                return False
            covered = covered_jobs_for(config_dept_id, group_jobs)
            return group_jobs.issubset(covered)

        # 3d) Generate plan_scopes only for matching (config-department, scope-default) pairs
        scope_rows_created = 0
        for dept_id in config_departments:
            for job_group_id, talent_status_id in scope_defaults:
                if not group_matches_department(job_group_id, dept_id):
                    continue
                self.session.add(
                    PlanScope(
                        plan_session_id=session_row.id,
                        department_id=dept_id,
                        job_group_id=job_group_id,
                        # NULL talent_status => Option 2 (combined); else Option 1
                        talent_status_id=talent_status_id,
                        value=None,
                    )
                )
                scope_rows_created += 1

        # No department/job-group combination matched → refuse, with a diagnostic
        # naming the first uncovered (department, group, missing jobs) gap so the
        # data problem is visible instead of a generic message.
        if scope_rows_created == 0:
            await self.session.rollback()
            diag = await self._build_no_match_diagnostic(
                config_departments=config_departments,
                scope_defaults=scope_defaults,
                group_active_jobs=group_active_jobs,
                covered_jobs_for=covered_jobs_for,
            )
            raise await self._resolve_domain_error(
                PlanSessionNoMatchingScopes(detail=diag)
            )

        try:
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()
            raise await self._resolve_domain_error(PlanSessionNameTaken(data.name))

        refreshed = await self._get_with_status(session_row.id)
        schema = PlanSessionSchema.model_validate(refreshed)
        detail = await self._resolve_domain_success(
            PlanSessionCreateSuccess(schema.name)
        )
        return MutationResponse(detail=detail, data=schema)

    async def _build_no_match_diagnostic(
        self,
        config_departments: list[int],
        scope_defaults: list[tuple[int, int | None]],
        group_active_jobs: dict[int, set[int]],
        covered_jobs_for,
    ) -> str:
        """
        Build a human-readable explanation of why no plan rows matched.

        For each config department and each scope-default job group, report the
        job(s) in the group that are NOT held by any instance in that
        department's subtree. Names are resolved for readability.

        Receives `scope_defaults` as plain tuples (not ORM objects) so it is
        safe to call after a rollback has expired ORM instances.
        """
        # Resolve names: departments, job groups, jobs
        dept_names: dict[int, str] = {}
        if config_departments:
            rows = (
                await self.session.execute(
                    select(Department.id, Department.name).where(
                        Department.id.in_(config_departments)
                    )
                )
            ).all()
            dept_names = {i: n for i, n in rows}

        group_ids = {jg for jg, _ in scope_defaults}
        all_job_ids: set[int] = set()
        for jids in group_active_jobs.values():
            all_job_ids |= jids

        from backend.api_v1.job_group.job_group_model import JobGroup as JobGroupModel
        group_names: dict[int, str] = {}
        if group_ids:
            grows = (
                await self.session.execute(
                    select(JobGroupModel.id, JobGroupModel.name).where(
                        JobGroupModel.id.in_(group_ids)
                    )
                )
            ).all()
            group_names = {i: n for i, n in grows}

        job_names: dict[int, str] = {}
        if all_job_ids:
            jrows = (
                await self.session.execute(
                    select(Job.id, Job.name).where(Job.id.in_(all_job_ids))
                )
            ).all()
            job_names = {i: n for i, n in jrows}

        lines: list[str] = []
        seen_group_gap: set[int] = set()
        reported_pairs: set[tuple[int, int]] = set()
        # scope_defaults may contain the same job_group_id multiple times (e.g.
        # one combined + several per-status rows). Report each (department,
        # job group) gap at most once.
        distinct_group_ids: list[int] = []
        for gid, _ in scope_defaults:
            if gid not in distinct_group_ids:
                distinct_group_ids.append(gid)

        for dept_id in config_departments:
            for gid in distinct_group_ids:
                group_jobs = group_active_jobs.get(gid, set())
                if not group_jobs:
                    if gid not in seen_group_gap:
                        seen_group_gap.add(gid)
                        lines.append(
                            f"• '{group_names.get(gid, gid)}': has no active jobs"
                        )
                    continue
                pair = (dept_id, gid)
                if pair in reported_pairs:
                    continue
                covered = covered_jobs_for(dept_id, group_jobs)
                missing = group_jobs - covered
                if missing:
                    reported_pairs.add(pair)
                    missing_names = ", ".join(
                        sorted(job_names.get(j, str(j)) for j in missing)
                    )
                    lines.append(
                        f"• '{dept_names.get(dept_id, dept_id)}' ✗ "
                        f"'{group_names.get(gid, gid)}': uncovered job(s): {missing_names}"
                    )

        if not lines:
            return ""
        return " | ".join(lines[:20])

    # ------------------------------------------------------------------
    # Update (name/description/dates) — re-validates overlap
    # ------------------------------------------------------------------
    async def update_plan_session(
        self, session_id: int, data: PlanSessionUpdate
    ) -> MutationResponse[PlanSessionSchema]:
        orm_record = await self.get_by_id(session_id)

        if data.name:
            await self.exists_by_name_excluding(
                data.name,
                exclude_ids=[session_id],
                already_exists_exc=PlanSessionNameTaken,
            )

        new_start = data.start_date or orm_record.start_date
        new_end = data.end_date or orm_record.end_date
        if data.start_date is not None or data.end_date is not None:
            if new_end < new_start:
                # mirror schema-level guard for partial updates
                raise await self._resolve_domain_error(
                    PlanSessionPeriodOverlap(orm_record.name)
                )
            await self._assert_no_overlap(new_start, new_end, exclude_id=session_id)

        await self.update(orm_record, data, partial=True)
        refreshed = await self._get_with_status(session_id)
        schema = PlanSessionSchema.model_validate(refreshed)
        detail = await self._resolve_domain_success(
            PlanSessionUpdateSuccess(schema.name)
        )
        return MutationResponse(detail=detail, data=schema)

    # ------------------------------------------------------------------
    # Status transitions
    # ------------------------------------------------------------------
    async def _set_status(self, session_id: int, key: str):
        orm_record = await self.get_by_id(session_id)
        status_id = await self.get_status_id_by_key(key)
        orm_record.plan_session_status_id = status_id
        await self.session.commit()
        # Re-load with status eager-loaded (commit expired the instance).
        return await self._get_with_status(session_id)

    async def open_plan_session(
        self, session_id: int
    ) -> MutationResponse[PlanSessionSchema]:
        updated = await self._set_status(session_id, PlanSessionStatusKey.OPEN.value)
        schema = PlanSessionSchema.model_validate(updated)
        detail = await self._resolve_domain_success(
            PlanSessionOpenSuccess(schema.name)
        )
        return MutationResponse(detail=detail, data=schema)

    async def close_plan_session(
        self, session_id: int
    ) -> MutationResponse[PlanSessionSchema]:
        updated = await self._set_status(session_id, PlanSessionStatusKey.CLOSED.value)
        schema = PlanSessionSchema.model_validate(updated)
        detail = await self._resolve_domain_success(
            PlanSessionCloseSuccess(schema.name)
        )
        return MutationResponse(detail=detail, data=schema)

    async def revert_plan_session(
        self, session_id: int
    ) -> MutationResponse[PlanSessionSchema]:
        """closed -> open. Blocked if it would create a 3rd active session."""
        orm_record = await self.get_by_id(session_id)
        current_status = await self.status_repo.get_by_id(
            orm_record.plan_session_status_id
        )
        if current_status.key != PlanSessionStatusKey.CLOSED.value:
            raise await self._resolve_domain_error(
                PlanSessionNotClosed(orm_record.name)
            )
        # adding=1 because this session is currently inactive (closed)
        active = await self.repository.count_by_status_keys(
            list(PLAN_SESSION_ACTIVE_STATUS_KEYS)
        )
        if active + 1 > 2:
            raise await self._resolve_domain_error(PlanSessionRevertBlocked())

        updated = await self._set_status(session_id, PlanSessionStatusKey.OPEN.value)
        schema = PlanSessionSchema.model_validate(updated)
        detail = await self._resolve_domain_success(
            PlanSessionRevertSuccess(schema.name)
        )
        return MutationResponse(detail=detail, data=schema)

    # ------------------------------------------------------------------
    # Delete
    # ------------------------------------------------------------------
    async def delete_plan_session(self, session_id: int) -> None:
        record = await self.get_by_id(session_id)
        await self.delete_by_id(
            session_id,
            name=record.name,
            delete_error_exc=PlanSessionDeleteError,
            delete_success_exc=PlanSessionDeleteSuccess,
        )