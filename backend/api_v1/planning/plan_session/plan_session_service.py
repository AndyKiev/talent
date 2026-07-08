from typing import Optional, List
from dataclasses import dataclass
from collections.abc import Callable

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
from backend.api_v1.department_category.department_category_model import (
    DepartmentCategory,
)
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
from backend.api_v1.planning.plan_session.plan_session_messages import (
    PlanSessionNotFound,
    PlanSessionNameTaken,
    PlanSessionCategoryOverlap,
    PlanSessionInvalidRange,
    PlanSessionPendingExists,
    PlanSessionActiveLimit,
    PlanSessionRevertBlocked,
    PlanSessionNotClosed,
    PlanSessionDeleteError,
    PlanSessionNoMatchingScopes,
    PlanSessionResyncNotOpen,
)
from backend.api_v1.planning.plan_session.plan_session_messages import (
    PlanSessionCreateSuccess,
    PlanSessionUpdateSuccess,
    PlanSessionDeleteSuccess,
    PlanSessionOpenSuccess,
    PlanSessionCloseSuccess,
    PlanSessionRevertSuccess,
    PlanSessionResyncSuccess,
)

from backend.api_v1.planning.plan_session_status.plan_session_status_repository import (
    PlanSessionStatusRepository,
)
from backend.api_v1.planning.plan_session_status.plan_session_status_messages import (
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


@dataclass
class _MatchResult:
    """Result of computing which scopes match the current config."""

    matching_tuples: list[
        tuple[int, int, int | None]
    ]  # (dept_id, job_group_id, talent_status_id)
    config_departments: list[int]
    scope_defaults: list[tuple[int, int | None]]  # (job_group_id, talent_status_id)
    group_active_jobs: dict[int, set[int]]
    covered_jobs_for: Callable[[int, set[int]], set[int]]


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
            raise await self._resolve_domain_error(PlanSessionStatusNotFoundByKey(key))
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
    async def _assert_no_category_overlap(
        self,
        category_ids: list[int],
        start_date,
        end_date,
        exclude_id: int | None = None,
    ) -> None:
        """A department category may not appear in two sessions whose date
        ranges overlap. (Two sessions MAY overlap in dates if they share no
        category.)"""
        if not category_ids:
            return
        conflicts = await self.repository.get_categories_overlapping(
            category_ids, start_date, end_date, exclude_id=exclude_id
        )
        if conflicts:
            session_name, category_id = conflicts[0]
            cat_name = await self._category_name(category_id)
            raise await self._resolve_domain_error(
                PlanSessionCategoryOverlap(cat_name, session_name)
            )

    async def _category_name(self, category_id: int) -> str:
        row = (
            await self.session.execute(
                select(DepartmentCategory.name).where(
                    DepartmentCategory.id == category_id
                )
            )
        ).scalar_one_or_none()
        return row or str(category_id)

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
    # Shared matcher (used by create + re-sync)
    # ------------------------------------------------------------------
    async def _compute_matching_scopes(self, category_ids: list[int]) -> _MatchResult:
        """
        Compute the set of (department_id, job_group_id, talent_status_id) scopes
        that match the CURRENT config (plan_scope_defaults) for the given config
        category ids.

        Rule: a config-category department matches a scope-default job group iff
        EVERY active job in that group is "held" by some department instance in the
        config department's subtree (itself or any active descendant via parent_id),
        where an instance holds a job iff the job is linked (active link, active job)
        to that instance's department_type_id.
        """
        # 1) Config-category departments (active) — the only row-emitting departments.
        config_departments: list[int] = []
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

        # 2) Active department-instance tree (id, parent_id, type) for subtree walks.
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

        # 3) Scope defaults → plain tuples (rollback-safe).
        scope_default_rows = await self.scope_default_repo.get_all(sort="id")
        scope_defaults: list[tuple[int, int | None]] = [
            (sd.job_group_id, sd.talent_status_id) for sd in scope_default_rows
        ]
        scope_job_group_ids = {jg for jg, _ in scope_defaults}

        # 3a) Active jobs per scope-default job group.
        group_active_jobs: dict[int, set[int]] = {
            gid: set() for gid in scope_job_group_ids
        }
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

        # 3b) type_id → {job_id} via active links to active jobs.
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
            tid = type_by_dept.get(dept_instance_id)
            if tid is None:
                return False
            return job_id in type_jobs.get(tid, set())

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
            return group_jobs.issubset(covered_jobs_for(config_dept_id, group_jobs))

        matching_tuples: list[tuple[int, int, int | None]] = []
        for dept_id in config_departments:
            for job_group_id, talent_status_id in scope_defaults:
                if group_matches_department(job_group_id, dept_id):
                    matching_tuples.append((dept_id, job_group_id, talent_status_id))

        return _MatchResult(
            matching_tuples=matching_tuples,
            config_departments=config_departments,
            scope_defaults=scope_defaults,
            group_active_jobs=group_active_jobs,
            covered_jobs_for=covered_jobs_for,
        )

    # ------------------------------------------------------------------
    # Creation + snapshot orchestration
    # ------------------------------------------------------------------
    async def create_plan_session(
        self, data: PlanSessionCreate
    ) -> MutationResponse[PlanSessionSchema]:
        await self.exists_by_name(data.name, already_exists_exc=PlanSessionNameTaken)
        await self._assert_pending_capacity()
        await self._assert_active_capacity(adding=1)

        # Resolve categories: explicit selection if provided, else defaults.
        selected = getattr(data, "department_category_ids", None)
        if selected:
            category_ids = list(dict.fromkeys(selected))  # de-dup, keep order
        else:
            category_defaults = await self.category_default_repo.get_all(sort="id")
            category_ids = [d.department_category_id for d in category_defaults]

        # A category may not appear in two sessions with overlapping dates.
        await self._assert_no_category_overlap(
            category_ids, data.start_date, data.end_date
        )

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

        # 1) Snapshot the resolved categories
        for cat_id in category_ids:
            self.session.add(
                PlanSessionCategory(
                    plan_session_id=session_row.id,
                    department_category_id=cat_id,
                )
            )

        # 2-3) Compute the set of matching (department, job_group, talent_status)
        #      scopes using the shared matcher (also used by re-sync).
        match = await self._compute_matching_scopes(category_ids)

        # 4) Generate plan_scopes for every matching tuple (active, value=NULL)
        for dept_id, job_group_id, talent_status_id in match.matching_tuples:
            self.session.add(
                PlanScope(
                    plan_session_id=session_row.id,
                    department_id=dept_id,
                    job_group_id=job_group_id,
                    talent_status_id=talent_status_id,
                    value=None,
                    is_active=True,
                )
            )

        # No matching combination → refuse, with a diagnostic naming the gaps.
        if not match.matching_tuples:
            await self.session.rollback()
            diag = await self._build_no_match_diagnostic(
                config_departments=match.config_departments,
                scope_defaults=match.scope_defaults,
                group_active_jobs=match.group_active_jobs,
                covered_jobs_for=match.covered_jobs_for,
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
                raise await self._resolve_domain_error(
                    PlanSessionInvalidRange(orm_record.name)
                )
            # Re-check per-category overlap for THIS session's categories.
            frozen = await self.session.execute(
                select(PlanSessionCategory.department_category_id).where(
                    PlanSessionCategory.plan_session_id == session_id
                )
            )
            session_category_ids = list(frozen.scalars().all())
            await self._assert_no_category_overlap(
                session_category_ids, new_start, new_end, exclude_id=session_id
            )

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
        detail = await self._resolve_domain_success(PlanSessionOpenSuccess(schema.name))
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

    # ------------------------------------------------------------------
    # Re-sync: reconcile an OPEN session's scopes against current config.
    # Adds newly-matching scopes, reactivates previously-deactivated matches,
    # soft-deactivates scopes that no longer match. Never touches `value`.
    # ------------------------------------------------------------------
    async def resync_plan_session(
        self, session_id: int, add_category_ids: list[int] | None = None
    ) -> MutationResponse[PlanSessionSchema]:
        session = await self.get_by_id(session_id)
        status = await self.status_repo.get_by_id(session.plan_session_status_id)
        if status.key != PlanSessionStatusKey.OPEN.value:
            raise await self._resolve_domain_error(
                PlanSessionResyncNotOpen(session.name)
            )

        # Optionally add NEW categories to this session before reconciling.
        if add_category_ids:
            existing = await self.session.execute(
                select(PlanSessionCategory.department_category_id).where(
                    PlanSessionCategory.plan_session_id == session_id
                )
            )
            existing_ids = set(existing.scalars().all())
            to_add = [
                c for c in dict.fromkeys(add_category_ids) if c not in existing_ids
            ]
            if to_add:
                # New categories must respect the per-category overlap rule.
                await self._assert_no_category_overlap(
                    to_add, session.start_date, session.end_date, exclude_id=session_id
                )
                for cat_id in to_add:
                    self.session.add(
                        PlanSessionCategory(
                            plan_session_id=session_id,
                            department_category_id=cat_id,
                        )
                    )
                await self.session.flush()

        # Reconcile against the session's (now possibly updated) categories.
        frozen = await self.session.execute(
            select(PlanSessionCategory.department_category_id).where(
                PlanSessionCategory.plan_session_id == session_id
            )
        )
        category_ids = list(frozen.scalars().all())

        match = await self._compute_matching_scopes(category_ids)
        matching_keys: set[tuple[int, int, int | None]] = set(match.matching_tuples)

        # Existing scopes for this session, keyed by (dept, group, talent_status).
        existing_rows = list(
            (
                await self.session.execute(
                    select(PlanScope).where(PlanScope.plan_session_id == session_id)
                )
            )
            .scalars()
            .all()
        )
        existing_by_key: dict[tuple[int, int, int | None], PlanScope] = {
            (r.department_id, r.job_group_id, r.talent_status_id): r
            for r in existing_rows
        }

        added = reactivated = deactivated = 0

        # Insert / reactivate matches.
        for key in matching_keys:
            row = existing_by_key.get(key)
            if row is None:
                dept_id, job_group_id, talent_status_id = key
                self.session.add(
                    PlanScope(
                        plan_session_id=session_id,
                        department_id=dept_id,
                        job_group_id=job_group_id,
                        talent_status_id=talent_status_id,
                        value=None,
                        is_active=True,
                    )
                )
                added += 1
            elif not row.is_active:
                row.is_active = True  # keep existing value
                reactivated += 1

        # Soft-deactivate scopes that no longer match.
        for key, row in existing_by_key.items():
            if key not in matching_keys and row.is_active:
                row.is_active = False  # keep existing value
                deactivated += 1

        await self.session.commit()

        refreshed = await self._get_with_status(session_id)
        schema = PlanSessionSchema.model_validate(refreshed)
        detail = await self._resolve_domain_success(
            PlanSessionResyncSuccess(
                schema.name,
                added=added,
                reactivated=reactivated,
                deactivated=deactivated,
            )
        )
        return MutationResponse(detail=detail, data=schema)
