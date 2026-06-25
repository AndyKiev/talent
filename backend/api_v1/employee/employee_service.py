# backend/api_v1/employee/employee_service.py
from typing import List, Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.employee.employee_repository import EmployeeRepository
from backend.api_v1.employee.employee_schema import (
    EmployeeSchema,
    EmployeeCreate,
    EmployeeUpdate,
    EmployeePersonalDataUpdate,
    MainDepartmentSchema,
)
from backend.api_v1.employee.employee_errors import (
    EmployeeNotFound,
    EmployeeNotFoundByCode,
    EmployeeCodeTaken,
    EmployeeEmailTaken,
    EmployeeDeleteError,
)
from backend.api_v1.employee.employee_success import EmployeeDeleteSuccess
from backend.api_v1.base.errors import DomainError
from backend.auth.permission_resolvers import (
    resolve_user_permissions,
    resolve_user_permission_sets,
)
from sqlalchemy import select, func, or_
from backend.api_v1.employee.employee_errors import EmployeeHasReferencesError

# Top-level org-unit derivation (board / directorate / store).
from backend.api_v1.department.department_repository import DepartmentRepository
from backend.api_v1.department.department_org_units import (
    resolve_top_org_unit,
    DepartmentIndex,
)


class EmployeeService(BaseService):
    def __init__(
        self,
        repository: EmployeeRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _get_org_index(self) -> DepartmentIndex:
        """Flat department index (id -> (parent_id, name, category_key)) used to
        resolve each department's top-level org unit. Built once per request and
        passed into _to_schema so list endpoints don't rebuild it per employee.

        Uses the REPOSITORY's session (always present) rather than self.session,
        which can be None on code paths that construct the service without one
        (e.g. JWT login -> _to_schema)."""
        dept_repo = DepartmentRepository(session=self.repository.session)
        return await dept_repo.get_org_unit_index()

    async def _to_schema(
        self, orm_employee, org_index: Optional[DepartmentIndex] = None
    ) -> EmployeeSchema:
        """Build a fully-populated EmployeeSchema from an ORM Employee instance."""
        if org_index is None:
            org_index = await self._get_org_index()

        operations = await self.repository.get_user_operations(orm_employee.id)
        schema = EmployeeSchema.model_validate(orm_employee)

        schema.operations = operations
        schema.permissions = resolve_user_permissions(orm_employee)
        schema.permission_sets = resolve_user_permission_sets(orm_employee)

        # Populate main_departments / extra_departments from the already
        # selectin-loaded relationship; derive each one's top-level org unit.
        schema.main_departments = [
            MainDepartmentSchema(
                id=link.id,
                department_id=link.department_id,
                name=(
                    link.department.name
                    if link.department
                    else f"ID {link.department_id}"
                ),
                top_department=resolve_top_org_unit(link.department_id, org_index),
            )
            for link in orm_employee.departments
            if link.is_main
        ]
        schema.extra_departments = [
            MainDepartmentSchema(
                id=link.id,
                department_id=link.department_id,
                name=(
                    link.department.name
                    if link.department
                    else f"ID {link.department_id}"
                ),
                top_department=resolve_top_org_unit(link.department_id, org_index),
            )
            for link in orm_employee.departments
            if not link.is_main
        ]

        return schema

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    async def get_by_id(self, id: int) -> EmployeeSchema:
        result = await self.repository.get_by_id(id)
        if not result:
            exc = EmployeeNotFound(id)
            raise await self._resolve_domain_error(exc)
        return await self._to_schema(result)

    async def get_by_code(self, code: str) -> EmployeeSchema:
        result = await self.repository.get_by_code(code)
        if not result:
            exc = EmployeeNotFoundByCode(code)
            raise await self._resolve_domain_error(exc)
        return await self._to_schema(result)

    async def get_all(
        self,
        params: dict | None = None,
        department_id: int | None = None,
        **kwargs,
    ) -> List[EmployeeSchema]:
        # Resolve the current user's visibility restriction based on their groups
        # and active HRM scopes. None = unrestricted; a set (possibly empty)
        # restricts to employees whose MAIN department is in that set.
        main_department_ids = await self._resolve_visible_main_department_ids()

        # Optional in-grid filter: narrow to one chosen department's subtree
        # (ancestor-or-self). Intersected with the user's visible set so an HRM
        # can never widen beyond their scope.
        if department_id is not None:
            dept_repo = DepartmentRepository(session=self.repository.session)
            chosen = await dept_repo.get_subtree_ids({department_id})
            if main_department_ids is None:
                main_department_ids = chosen
            else:
                main_department_ids = main_department_ids & chosen

        users = await self.repository.get_all(
            filters=params, main_department_ids=main_department_ids
        )
        # Build the org-unit index once for the whole list.
        org_index = await self._get_org_index()
        return [await self._to_schema(u, org_index) for u in users]

    async def get_scope_select_departments(self) -> list[dict]:
        """
        Ordered department list for the employees-page filter Select.
          - admin / HRS -> ALL departments
          - HRM         -> their ACTIVE scope departments (the responsibility
                           roots themselves, NOT subtrees)
          - neither     -> [] (frontend then hides the Select)
        Ordering (store -> directorate -> other, by region.sort_order) is done
        in DepartmentRepository.get_scope_select_departments.
        """
        from backend.api_v1.hrm_scope.hrm_scope_constants import (
            has_bypass,
            is_hrm,
            STORE_CATEGORY_KEY,
            DIRECTORATE_CATEGORY_KEY,
        )

        allowed_ids = await self._resolve_scope_select_allowed_ids()
        dept_repo = DepartmentRepository(session=self.repository.session)
        # has_bypass/is_hrm already consumed inside the allowed-ids resolver;
        # imported keys are passed to keep category identification centralised.
        _ = (has_bypass, is_hrm)
        return await dept_repo.get_scope_select_departments(
            allowed_ids,
            store_key=STORE_CATEGORY_KEY,
            directorate_key=DIRECTORATE_CATEGORY_KEY,
        )

    async def _resolve_scope_select_allowed_ids(self) -> Optional[set[int]]:
        """
        Department ids the current user may pick in the filter Select:
          - bypass (admin/HRS) -> None (all departments)
          - HRM                -> their ACTIVE scope roots (not expanded)
          - neither            -> empty set
        """
        from backend.api_v1.hrm_scope.hrm_scope_constants import has_bypass, is_hrm
        from backend.api_v1.hrm_scope.hrm_scope_repository import HrmScopeRepository
        from datetime import date

        if self.user is None:
            return None
        groups = getattr(self.user, "groups", []) or []
        if has_bypass(groups):
            return None
        if not is_hrm(groups):
            return set()

        hrm_repo = HrmScopeRepository(session=self.repository.session)
        return await hrm_repo.get_active_scope_department_ids(
            self.user.id, date.today()
        )

    async def _resolve_visible_main_department_ids(self) -> Optional[set[int]]:
        """
        Decide which employees the current user may see, expressed as the set of
        allowed MAIN department ids (or None for unrestricted).

          - bypass group (admin / HRS)  -> None  (see ALL)
          - HRM group                   -> union of ACTIVE scope departments and
                                           all their descendants (ancestor-or-self);
                                           empty set if no active scopes -> sees none
          - neither                     -> empty set (sees NONE)

        Bypass wins when a user is both HRM and admin/HRS.
        """
        # Reuse the Select-allowed resolver: same role logic, then expand HRM
        # roots to subtrees.
        allowed_roots = await self._resolve_scope_select_allowed_ids()
        if allowed_roots is None:
            return None  # bypass: unrestricted
        if not allowed_roots:
            return set()  # neither, or HRM with no active scopes

        dept_repo = DepartmentRepository(session=self.repository.session)
        return await dept_repo.get_subtree_ids(allowed_roots)

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    async def create_user(self, user_in: EmployeeCreate) -> EmployeeSchema:
        if await self.repository.get_by_field("code", user_in.code.strip().upper()):
            exc = EmployeeCodeTaken(user_in.code)
            raise await self._resolve_domain_error(exc)
        if user_in.email and await self.repository.get_by_field("email", user_in.email):
            exc = EmployeeEmailTaken(user_in.email)
            raise await self._resolve_domain_error(exc)
        try:
            orm_user = await self.create(user_in)
            return await self._to_schema(orm_user)
        except IntegrityError:
            exc = EmployeeCodeTaken(user_in.code)
            raise await self._resolve_domain_error(exc)

    async def update_user(
        self, user_id: int, user_update: EmployeeUpdate
    ) -> EmployeeSchema:
        if user_update.email:
            existing = await self.repository.get_by_field("email", user_update.email)
            if existing and existing.id != user_id:
                exc = EmployeeEmailTaken(user_update.email)
                raise await self._resolve_domain_error(exc)
        try:
            orm_user = await self.repository.get_by_id(user_id)
            if not orm_user:
                exc = EmployeeNotFound(user_id)
                raise await self._resolve_domain_error(exc)
            updated = await self.update(orm_user, user_update, partial=True)
            return await self._to_schema(updated)
        except IntegrityError:
            exc = EmployeeEmailTaken(user_update.email or "")
            raise await self._resolve_domain_error(exc)

    # ------------------------------------------------------------------
    # People-review: current level + personal data (1:1 link tables)
    # ------------------------------------------------------------------

    async def set_current_level(self, user_id: int, level_id: int) -> EmployeeSchema:
        """Set the employee's current career level via the 1:1 link table."""
        try:
            orm_user = await self.repository.set_current_level(user_id, level_id)
            return await self._to_schema(orm_user)
        except DomainError as exc:
            raise await self._resolve_domain_error(exc)

    async def set_personal_data(
        self, user_id: int, data: "EmployeePersonalDataUpdate"
    ) -> EmployeeSchema:
        """Upsert the employee's personal data via the 1:1 table. Partial: only
        the fields actually provided are applied (birth_date and/or hire_date)."""
        fields = data.model_dump(exclude_unset=True)
        try:
            orm_user = await self.repository.set_personal_data(user_id, fields)
            return await self._to_schema(orm_user)
        except DomainError as exc:
            raise await self._resolve_domain_error(exc)

    # async def delete_user(self, user_id: int) -> None:
    #     record = await self.get_by_id(user_id)
    #     await self.delete_by_id(
    #         user_id,
    #         name=record.name,
    #         delete_error_exc=EmployeeDeleteError,
    #         delete_success_exc=EmployeeDeleteSuccess,
    #     )
    DELETE_BLOCKER_LABELS = {
        "departmentLinks": ("blockerDepartmentLinks", "department links"),
        "events": ("blockerEvents", "events"),
        "authoredEvents": ("blockerAuthoredEvents", "authored events"),
        "talentAudits": ("blockerTalentAudits", "talent audits"),
        "authoredTalentAudits": (
            "blockerAuthoredTalentAudits",
            "authored talent audits",
        ),
        "authoredTalentInterviews": (
            "blockerAuthoredTalentInterviews",
            "authored talent interviews",
        ),
        "authoredTalentInterviewJobs": (
            "blockerAuthoredTalentInterviewJobs",
            "authored talent interview jobs",
        ),
        "authoredTalentJobs": ("blockerAuthoredTalentJobs", "authored talent jobs"),
    }

    async def check_delete_blockers(self, employee_id: int) -> dict[str, int]:
        """
        Count every record that references this employee via a RESTRICT FK.
        Returns {blocker_key: count} for all non-zero blockers.
        """
        from sqlalchemy import text

        checks = [
            ("departmentLinks", "employee_departments", "employee_id"),
            ("events", "employee_events", "employee_id"),
            ("authoredEvents", "employee_events", "created_by"),
            ("authoredTalentAudits", "talent_audit", "created_by"),
            ("authoredTalentInterviews", "talent_audit_interview", "created_by"),
            ("authoredTalentInterviewJobs", "talent_audit_interview_job", "created_by"),
            ("authoredTalentJobs", "talent_audit_job", "created_by"),
        ]

        blockers: dict[str, int] = {}
        for label, table, column in checks:
            stmt = text(f"SELECT COUNT(*) FROM {table} WHERE {column} = :eid")
            result = await self.session.execute(stmt, {"eid": employee_id})
            count = result.scalar() or 0
            if count:
                blockers[label] = count

        # The employee's OWN talent_audit blocks deletion only when it actually
        # holds data (>=1 job or >=1 interview). Empty audits are cascade-deleted
        # in delete_user, so they must NOT count as a blocker here.
        nonempty_audits = text(
            "SELECT COUNT(*) FROM talent_audit ta "
            "WHERE ta.employee_id = :eid AND ("
            "EXISTS (SELECT 1 FROM talent_audit_job j WHERE j.talent_audit_id = ta.id) OR "
            "EXISTS (SELECT 1 FROM talent_audit_interview i WHERE i.talent_audit_id = ta.id))"
        )
        cnt = (
            await self.session.execute(nonempty_audits, {"eid": employee_id})
        ).scalar() or 0
        if cnt:
            blockers["talentAudits"] = cnt
        return blockers

    async def _build_blocker_summary(self, blockers: dict[str, int]) -> str:
        """
        Translate each blocker label in the user's language and build a summary
        like 'підрозділи: 1, події: 2'.
        """
        parts: list[str] = []
        for key, count in blockers.items():
            msg_key, fallback = self.DELETE_BLOCKER_LABELS.get(key, (key, key))
            label = await self._translate(msg_key, None, fallback)
            parts.append(f"{label}: {count}")
        return ", ".join(parts)

    # ── CHANGE delete_user to run the pre-flight check ──────────────────────────────

    async def delete_user(self, user_id: int, force: bool = False) -> None:
        record = await self.get_by_id(user_id)
        from sqlalchemy import text

        # Dev/superadmin force-delete: cascade the employee's OWN dependent records
        # before the pre-flight check — events (their change rows cascade at the DB)
        # and department links. Records that belong to OTHER employees (authored_*)
        # are intentionally NOT touched and will still block below.
        is_dev = bool(self.user and getattr(self.user, "is_bypass", False))
        if force and is_dev:
            await self.session.execute(
                text("DELETE FROM employee_events WHERE employee_id = :eid"),
                {"eid": user_id},
            )
            await self.session.execute(
                text("DELETE FROM employee_departments WHERE employee_id = :eid"),
                {"eid": user_id},
            )

        # Pre-flight: collect every blocking reference and report them all at once,
        # with each label translated into the user's language.
        blockers = await self.check_delete_blockers(user_id)
        if blockers:
            summary = await self._build_blocker_summary(blockers)
            raise await self._resolve_domain_error(
                EmployeeHasReferencesError(record.code, summary)
            )

        # Cascade-delete the employee's EMPTY talent audits (no jobs, no
        # interviews) so the RESTRICT FK doesn't block the delete. Non-empty
        # audits were already reported as blockers above, so we never reach
        # here while one exists.
        await self.session.execute(
            text(
                "DELETE FROM talent_audit ta WHERE ta.employee_id = :eid AND "
                "NOT EXISTS (SELECT 1 FROM talent_audit_job j WHERE j.talent_audit_id = ta.id) AND "
                "NOT EXISTS (SELECT 1 FROM talent_audit_interview i WHERE i.talent_audit_id = ta.id)"
            ),
            {"eid": user_id},
        )

        await self.delete_by_id(
            user_id,
            name=record.name,
            delete_error_exc=EmployeeDeleteError,
            delete_success_exc=EmployeeDeleteSuccess,
        )

    # ------------------------------------------------------------------
    # Group management
    # ------------------------------------------------------------------

    async def add_to_group(self, user_id: int, user_group_id: int) -> EmployeeSchema:
        try:
            orm_user = await self.repository.add_to_group(user_id, user_group_id)
            return await self._to_schema(orm_user)
        except DomainError as exc:
            raise await self._resolve_domain_error(exc)

    async def remove_from_group(
        self, user_id: int, user_group_id: int
    ) -> EmployeeSchema:
        try:
            orm_user = await self.repository.remove_from_group(user_id, user_group_id)
            return await self._to_schema(orm_user)
        except DomainError as exc:
            raise await self._resolve_domain_error(exc)

    async def set_groups(
        self, user_id: int, user_group_ids: List[int]
    ) -> EmployeeSchema:
        try:
            orm_user = await self.repository.set_groups(user_id, user_group_ids)
            return await self._to_schema(orm_user)
        except DomainError as exc:
            raise await self._resolve_domain_error(exc)

    # ------------------------------------------------------------------
    # Job-group sync
    # ------------------------------------------------------------------

    async def sync_groups_from_job(self, employee_id: int) -> EmployeeSchema:
        try:
            orm_user, added, _ = await self.repository.sync_groups_from_job(employee_id)
            return await self._to_schema(orm_user)
        except DomainError as exc:
            raise await self._resolve_domain_error(exc)

    async def sync_job_users_groups(self, job_id: int) -> "SyncJobResult":
        employee_ids = await self.repository.get_employee_ids_by_job(job_id)
        total_employees = len(employee_ids)
        total_added = 0
        total_removed = 0
        for uid in employee_ids:
            try:
                _, added, removed = await self.repository.sync_groups_from_job(uid)
                total_added += added
                total_removed += removed
            except DomainError:
                pass
        return SyncJobResult(
            job_id=job_id,
            employees_processed=total_employees,
            links_added=total_added,
            links_removed=total_removed,
        )


# ------------------------------------------------------------------
# Response schemas for sync endpoints
# ------------------------------------------------------------------

from pydantic import BaseModel  # noqa: E402


class SyncUserResult(BaseModel):
    user_id: int
    links_added: int
    links_removed: int


class SyncJobResult(BaseModel):
    job_id: int
    employees_processed: int
    links_added: int
    links_removed: int


class SyncAllResult(BaseModel):
    jobs_processed: int
    employees_processed: int
    links_added: int
    links_removed: int
