# backend/api_v1/employee/employee_service.py

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.errors import DomainError, NotFoundError
from backend.api_v1.department.department_org_units import (
    DepartmentIndex,
    resolve_top_org_unit,
)

# Top-level org-unit derivation (board / directorate / store).
from backend.api_v1.department.department_repository import DepartmentRepository
from backend.api_v1.employee.employee_messages import (
    EmployeeCodeTaken,
    EmployeeDeleteError,
    EmployeeDeleteSuccess,
    EmployeeEmailTaken,
    EmployeeHasReferencesError,
    EmployeeNotFound,
    EmployeeNotFoundByCode,
    EmployeePersonRequired,
)
from backend.api_v1.employee.employee_repository import EmployeeRepository
from backend.api_v1.employee.employee_schema import (
    EmployeeCreate,
    EmployeePersonalDataUpdate,
    EmployeeSchema,
    EmployeeUpdate,
    MainDepartmentSchema,
)
from backend.auth.permission_resolvers import (
    has_authorisation_group,
    resolve_user_permission_sets,
    resolve_user_permissions,
)


class EmployeeService(BaseService):
    def __init__(
        self,
        repository: EmployeeRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _get_regular_fallback_group(self, orm_employee):
        """The seeded 'regular' UserGroup — the implicit permission baseline for
        employees WITHOUT any authorisation group. Returns None for employees
        that do have one (no extra query in the common case), or when the
        seeded group is missing."""
        if has_authorisation_group(orm_employee):
            return None
        from backend.api_v1.user_group.user_group_model import UserGroup
        from backend.api_v1.user_group_type.user_group_type_model import UserGroupType

        stmt = (
            select(UserGroup)
            .join(UserGroupType, UserGroupType.id == UserGroup.user_group_type_id)
            .where(
                UserGroup.is_regular_baseline.is_(True),
                UserGroupType.is_authorisation.is_(True),
            )
        )
        return await self.repository.session.scalar(stmt)

    async def _get_org_index(self) -> DepartmentIndex:
        """Flat department index (id -> (parent_id, name, category_key)) used to
        resolve each department's top-level org unit. Built once per request and
        passed into _to_schema so list endpoints don't rebuild it per employee.

        Uses the REPOSITORY's session (always present) rather than self.session,
        which can be None on code paths that construct the service without one
        (e.g. JWT login -> _to_schema)."""
        dept_repo = DepartmentRepository(session=self.repository.session)
        return await dept_repo.get_org_unit_index()

    async def _to_auth_schema(self, orm_employee) -> EmployeeSchema:
        """Slim EmployeeSchema for the per-request AUTH dependency.

        Pairs with EmployeeRepository.get_by_code_for_auth: only identity +
        access-control fields are populated (code, is_active, lang_id, groups,
        operations, permissions, permission_sets). job/lang/status/departments
        stay empty — guards never read them; /jwt/users/me refetches the full
        profile via _to_schema.
        """
        operations = await self.repository.get_user_operations(orm_employee.id)
        fallback_group = await self._get_regular_fallback_group(orm_employee)
        schema = EmployeeSchema.model_validate(orm_employee)
        schema.operations = operations
        schema.permissions = resolve_user_permissions(orm_employee, fallback_group)
        schema.permission_sets = resolve_user_permission_sets(
            orm_employee, fallback_group
        )
        return schema

    async def _to_schema(
        self, orm_employee, org_index: DepartmentIndex | None = None
    ) -> EmployeeSchema:
        """Build a fully-populated EmployeeSchema from an ORM Employee instance."""
        if org_index is None:
            org_index = await self._get_org_index()

        operations = await self.repository.get_user_operations(orm_employee.id)
        fallback_group = await self._get_regular_fallback_group(orm_employee)
        schema = EmployeeSchema.model_validate(orm_employee)

        schema.operations = operations
        schema.permissions = resolve_user_permissions(orm_employee, fallback_group)
        schema.permission_sets = resolve_user_permission_sets(
            orm_employee, fallback_group
        )

        # Populate main_department / responsibility_departments from the
        # selectin-loaded relationships; derive each one's top-level org unit.
        def _link_schema(link) -> MainDepartmentSchema:
            return MainDepartmentSchema(
                id=link.id,
                department_id=link.department_id,
                name=(
                    link.department.name
                    if link.department
                    else f"ID {link.department_id}"
                ),
                top_department=resolve_top_org_unit(link.department_id, org_index),
                department_category_sort_order=(
                    link.department.department_category.sort_order
                    if link.department and link.department.department_category
                    else 0
                ),
            )

        # Responsibility links carry a department TYPE (no org-tree position),
        # so they build a different slim schema than the MAIN instance link.
        def _resp_link_schema(link) -> MainDepartmentSchema:
            return MainDepartmentSchema(
                id=link.id,
                department_type_id=link.department_type_id,
                name=(
                    link.department_type.name
                    if link.department_type
                    else f"TYPE {link.department_type_id}"
                ),
            )

        main_links = orm_employee.departments or []
        schema.main_department = _link_schema(main_links[0]) if main_links else None
        schema.responsibility_departments = [
            _resp_link_schema(link)
            for link in (orm_employee.responsibility_departments or [])
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

    async def update_my_lang(self, code: str, lang_id: int) -> str:
        """
        Self-service: switch the calling user's app language.
        Returns the success detail translated in the NEW language.
        """
        from backend.api_v1.employee.employee_messages import MyLangUpdateSuccess
        from backend.api_v1.lang.lang_model import Lang

        lang = await self.session.get(Lang, lang_id)
        if lang is None:
            raise NotFoundError("Lang", "id", lang_id)
        orm_user = await self.repository.get_by_code(code)
        if not orm_user:
            exc = EmployeeNotFoundByCode(code)
            raise await self._resolve_domain_error(exc)
        orm_user.lang_id = lang_id
        await self.session.commit()
        # Translate the confirmation in the language just chosen.
        if self.user:
            self.user.lang_id = lang_id
        return await self._resolve_domain_success(MyLangUpdateSuccess(lang.name))

    async def get_all(
        self,
        params: dict | None = None,
        department_id: int | None = None,
        **kwargs,
    ) -> list[EmployeeSchema]:
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

    async def get_responsibility_type_options(
        self, employee_id: int, department_category_id: int
    ) -> list[dict]:
        """
        Distinct department TYPES available as responsibility options for an
        employee: the types of the department INSTANCES inside the employee's
        MAIN-department subtree that belong to the given category. Sorted by
        type name. Empty when the employee has no main department or no matching
        children (graceful — never an error).
        """
        from backend.api_v1.department.department_model import Department
        from backend.api_v1.department_type.department_type_model import DepartmentType
        from backend.api_v1.employee_department.employee_department_model import (
            EmployeeDepartment,
        )

        main_dept_id = (
            await self.session.scalars(
                select(EmployeeDepartment.department_id).where(
                    EmployeeDepartment.employee_id == employee_id
                )
            )
        ).first()
        if main_dept_id is None:
            return []

        dept_repo = DepartmentRepository(session=self.session)
        subtree_ids = await dept_repo.get_subtree_ids({main_dept_id})
        if not subtree_ids:
            return []

        stmt = (
            select(DepartmentType.id, DepartmentType.name)
            .join(Department, Department.department_type_id == DepartmentType.id)
            .where(
                Department.id.in_(subtree_ids),
                Department.department_category_id == department_category_id,
                Department.is_active.is_(True),
            )
            .distinct()
            .order_by(DepartmentType.name.asc())
        )
        rows = (await self.session.execute(stmt)).all()
        return [{"id": r.id, "name": r.name} for r in rows]

    async def get_scope_select_departments(self) -> list[dict]:
        """
        Ordered department list for the employees-page filter Select.
        Only MAIN departments (category is_main=True, department is_active=True).
          - admin / HRS / dev -> ALL active main departments
          - HRM               -> their ACTIVE scope departments (the responsibility
                                 roots themselves, NOT subtrees)
          - neither           -> [] (frontend then hides the Select)
        Ordering (store -> directorate -> other, by region.sort_order) is done
        in DepartmentRepository.get_scope_select_departments.
        """
        from backend.api_v1.hrm_scope.hrm_scope_constants import (
            DIRECTORATE_CATEGORY_KEY,
            STORE_CATEGORY_KEY,
            has_bypass,
            is_hrm,
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

    async def _resolve_scope_select_allowed_ids(self) -> set[int] | None:
        """
        Department ids the current user may pick in the filter Select:
          - bypass (admin/HRS) -> None (all departments)
          - HRM                -> their ACTIVE scope roots (not expanded)
          - neither            -> empty set
        """
        from datetime import date

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
        return await hrm_repo.get_active_scope_department_ids(
            self.user.id, date.today()
        )

    async def _resolve_visible_main_department_ids(self) -> set[int] | None:
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

        # employees.person_id is NOT NULL and the name parts live ONLY on the
        # person, so there is no name string left to synthesize one from: every
        # caller creates the person first (POST /employees/with_activation and
        # self-registration both do, and both run the namesake check on the way).
        if user_in.person_id is None:
            raise await self._resolve_domain_error(EmployeePersonRequired())

        try:
            orm_user = await self.create(user_in)
            return await self._to_schema(orm_user)
        except IntegrityError:
            await self.repository.session.rollback()
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
        """Partial upsert of the employee's personal data. PERSON-level fields
        (sex, marital_status, birth_date) are written to the linked person
        (employees.person_id is NOT NULL); the 1:1 personal-data table keeps
        only employment dates (hire_date, job_assigned_date)."""
        fields = data.model_dump(exclude_unset=True)
        try:
            person_backed = {"sex", "marital_status", "birth_date"}
            if person_backed & fields.keys():
                orm_user = await self.repository.get_by_id(user_id)
                if not orm_user:
                    raise EmployeeNotFound(user_id)
                person = orm_user.person
                if "sex" in fields:
                    from backend.api_v1.sex.sex_model import SEX_ID_BY_NAME

                    sex_value = fields.pop("sex")
                    person.sex_id = SEX_ID_BY_NAME.get(sex_value) if sex_value else None
                if "marital_status" in fields:
                    from backend.api_v1.marital_status.marital_status_model import (
                        MARITAL_STATUS_ID_BY_NAME,
                    )

                    marital_value = fields.pop("marital_status")
                    person.marital_status_id = (
                        MARITAL_STATUS_ID_BY_NAME.get(marital_value)
                        if marital_value
                        else None
                    )
                if "birth_date" in fields:
                    person.birth_date = fields.pop("birth_date")
                await self.repository.session.commit()
                # expire_on_commit=False keeps sex_ref/marital_status_ref stale
                # after the *_id change — refresh so the response serializes the
                # new values.
                await self.repository.session.refresh(
                    person, ["sex_ref", "marital_status_ref"]
                )
            if fields:
                orm_user = await self.repository.set_personal_data(user_id, fields)
            else:
                orm_user = await self.repository.get_by_id(user_id)
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
    # ── Employee delete: reference map ──────────────────────────────────────
    # Every FK that points at employees.id and is NOT auto-resolved by the DB
    # (i.e. NOT ondelete=CASCADE / SET NULL) must be accounted for here, or the
    # final DELETE raises a cryptic IntegrityError. Two groups:
    #
    #   OWNED    — the employee's own data / links / participation / scope.
    #              Reported as a blocker on a normal delete; CASCADE-deleted
    #              (children first) on a dev force-delete.
    #   AUTHORED — content the employee created ABOUT OTHER employees. ALWAYS a
    #              blocker — never silently destroyed, even on force.
    #
    # KEEP _OWNED_BLOCKERS in sync with _force_cascade_sql(): every OWNED table
    # counted here must be cleared there.

    # (blocker_key, count_sql) — count_sql counts rows referencing :eid
    _OWNED_BLOCKERS: list[tuple[str, str]] = [
        (
            "departmentLinks",
            "SELECT COUNT(*) FROM employee_departments WHERE employee_id = :eid",
        ),
        (
            "responsibilityDepartmentLinks",
            "SELECT COUNT(*) FROM employee_responsibility_departments WHERE employee_id = :eid",
        ),
        ("events", "SELECT COUNT(*) FROM employee_events WHERE employee_id = :eid"),
        (
            "userGroupLinks",
            "SELECT COUNT(*) FROM employee_user_group_links WHERE employee_id = :eid",
        ),
        (
            "personalData",
            "SELECT COUNT(*) FROM employee_personal_data WHERE employee_id = :eid",
        ),
        (
            "currentLevel",
            "SELECT COUNT(*) FROM employee_current_levels WHERE employee_id = :eid",
        ),
        (
            "educations",
            "SELECT COUNT(*) FROM employee_educations WHERE employee_id = :eid",
        ),
        # NOTE: children and the language profile are PERSON-level
        # (employee_children.person_id, employee_language_profiles.person_id) —
        # they cascade with the orphaned person, not with the employee.
        (
            "reviewParticipation",
            "SELECT COUNT(*) FROM review_session_employees WHERE employee_id = :eid",
        ),
        ("hrmScopes", "SELECT COUNT(*) FROM hrm_scopes WHERE employee_id = :eid"),
        (
            "processRoleHolder",
            "SELECT COUNT(*) FROM process_role_holders WHERE holder_employee_id = :eid",
        ),
        (
            "processRoleEmployeeLinks",
            "SELECT COUNT(*) FROM process_role_holder_employee_links WHERE employee_id = :eid",
        ),
        (
            "processRoleActiveContexts",
            "SELECT COUNT(*) FROM process_role_active_contexts WHERE employee_id = :eid",
        ),
    ]

    # (blocker_key, count_sql) — content authored about OTHERS; never cascaded
    _AUTHORED_BLOCKERS: list[tuple[str, str]] = [
        (
            "authoredEvents",
            "SELECT COUNT(*) FROM employee_events WHERE created_by = :eid",
        ),
        (
            "authoredTalentAudits",
            "SELECT COUNT(*) FROM talent_audit WHERE created_by = :eid",
        ),
        (
            "authoredTalentInterviews",
            "SELECT COUNT(*) FROM talent_audit_interview WHERE created_by = :eid",
        ),
        (
            "authoredTalentInterviewJobs",
            "SELECT COUNT(*) FROM talent_audit_interview_job WHERE created_by = :eid",
        ),
        (
            "authoredTalentJobs",
            "SELECT COUNT(*) FROM talent_audit_job WHERE created_by = :eid",
        ),
        (
            "authoredReviewComments",
            "SELECT COUNT(*) FROM review_session_employee_comments WHERE author_id = :eid",
        ),
        (
            "assignedProcessRoles",
            "SELECT COUNT(*) FROM process_role_holders WHERE assigned_by = :eid",
        ),
    ]

    DELETE_BLOCKER_LABELS = {
        # OWNED
        "departmentLinks": ("blockerDepartmentLinks", "department links"),
        "responsibilityDepartmentLinks": (
            "blockerResponsibilityDepartmentLinks",
            "responsibility department links",
        ),
        "events": ("blockerEvents", "events"),
        "userGroupLinks": ("blockerUserGroupLinks", "user group memberships"),
        "personalData": ("blockerPersonalData", "personal data"),
        "currentLevel": ("blockerCurrentLevel", "current level"),
        "educations": ("blockerEducations", "education records"),
        "reviewParticipation": ("blockerReviewParticipation", "review participations"),
        "hrmScopes": ("blockerHrmScopes", "HRM responsibility scopes"),
        "processRoleHolder": ("blockerProcessRoleHolder", "process role assignments"),
        "processRoleEmployeeLinks": (
            "blockerProcessRoleEmployeeLinks",
            "process role links",
        ),
        "processRoleActiveContexts": (
            "blockerProcessRoleActiveContexts",
            "active process role contexts",
        ),
        "talentAudits": ("blockerTalentAudits", "talent audits"),
        # AUTHORED
        "authoredEvents": ("blockerAuthoredEvents", "authored events"),
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
        "authoredReviewComments": (
            "blockerAuthoredReviewComments",
            "authored review comments",
        ),
        "assignedProcessRoles": (
            "blockerAssignedProcessRoles",
            "process roles assigned to others",
        ),
    }

    def _force_cascade_sql(self) -> list[str]:
        """
        Ordered DELETEs (children first) that clear all of the employee's OWN
        data / links / participation / scope so the final employee DELETE can
        succeed. Run ONLY on a dev force-delete. Must stay in sync with
        _OWNED_BLOCKERS. AUTHORED content (about other employees) is never here.
        """
        return [
            # talent-audit subtree the employee OWNS (deepest children first).
            # Empties the audit so the existing empty-audit delete in delete_user
            # can drop the talent_audit row itself; without this, a non-empty
            # audit blocks the delete (check_delete_blockers -> talentAudits).
            "DELETE FROM talent_audit_interview_job WHERE talent_audit_interview_id IN (SELECT i.id FROM talent_audit_interview i JOIN talent_audit ta ON ta.id = i.talent_audit_id WHERE ta.employee_id = :eid)",
            "DELETE FROM talent_audit_interview WHERE talent_audit_id IN (SELECT id FROM talent_audit WHERE employee_id = :eid)",
            "DELETE FROM talent_audit_interview_job WHERE talent_audit_job_id IN (SELECT j.id FROM talent_audit_job j JOIN talent_audit ta ON ta.id = j.talent_audit_id WHERE ta.employee_id = :eid)",
            "DELETE FROM talent_audit_job WHERE talent_audit_id IN (SELECT id FROM talent_audit WHERE employee_id = :eid)",
            # review-session participation subtree (deepest children first)
            "DELETE FROM review_session_employee_criterion_scores WHERE review_session_employee_evaluation_id IN (SELECT id FROM review_session_employee_evaluations WHERE review_session_employee_id IN (SELECT id FROM review_session_employees WHERE employee_id = :eid))",
            "DELETE FROM review_session_employee_level_answers WHERE review_session_employee_level_id IN (SELECT id FROM review_session_employee_levels WHERE review_session_employee_id IN (SELECT id FROM review_session_employees WHERE employee_id = :eid))",
            "DELETE FROM review_session_employee_evaluations WHERE review_session_employee_id IN (SELECT id FROM review_session_employees WHERE employee_id = :eid)",
            "DELETE FROM review_session_employee_levels WHERE review_session_employee_id IN (SELECT id FROM review_session_employees WHERE employee_id = :eid)",
            "DELETE FROM review_session_employee_comments WHERE review_session_employee_id IN (SELECT id FROM review_session_employees WHERE employee_id = :eid)",
            "DELETE FROM review_session_employees WHERE employee_id = :eid",
            # (language profile is PERSON-level now — cascades with the person)
            # process-role subtree (holder rows the employee HOLDS)
            "DELETE FROM process_role_holder_department_links WHERE process_role_holder_id IN (SELECT id FROM process_role_holders WHERE holder_employee_id = :eid)",
            "DELETE FROM process_role_holder_employee_links WHERE process_role_holder_id IN (SELECT id FROM process_role_holders WHERE holder_employee_id = :eid)",
            "DELETE FROM process_role_holder_employee_links WHERE employee_id = :eid",
            "DELETE FROM process_role_active_contexts WHERE employee_id = :eid",
            "DELETE FROM process_role_holders WHERE holder_employee_id = :eid",
            # hrm scope + group links (hrm_scopes also cascades via user_group_links)
            "DELETE FROM hrm_scopes WHERE employee_id = :eid",
            "DELETE FROM employee_user_group_links WHERE employee_id = :eid",
            # simple owned 1:1 / child data
            "DELETE FROM employee_personal_data WHERE employee_id = :eid",
            "DELETE FROM employee_current_levels WHERE employee_id = :eid",
            "DELETE FROM employee_educations WHERE employee_id = :eid",
            # events + departments (event change rows cascade at the DB)
            "DELETE FROM employee_events WHERE employee_id = :eid",
            "DELETE FROM employee_departments WHERE employee_id = :eid",
            "DELETE FROM employee_responsibility_departments WHERE employee_id = :eid",
        ]

    async def check_delete_blockers(self, employee_id: int) -> dict[str, int]:
        """
        Count every record that blocks deletion of this employee (OWNED +
        AUTHORED references). Returns {blocker_key: count} for all non-zero
        blockers. On a dev force-delete the OWNED tables are cleared first, so
        only AUTHORED references survive to be reported here.
        """
        from sqlalchemy import text

        blockers: dict[str, int] = {}
        for label, sql in (*self._OWNED_BLOCKERS, *self._AUTHORED_BLOCKERS):
            count = (
                await self.session.execute(text(sql), {"eid": employee_id})
            ).scalar() or 0
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

        # Dev/superadmin force-delete: cascade ALL of the employee's OWN dependent
        # records (children first) before the pre-flight check — see
        # _force_cascade_sql(). Records that belong to OTHER employees (authored_*)
        # are intentionally NOT touched and will still block below.
        is_dev = bool(self.user and getattr(self.user, "is_bypass", False))
        if force and is_dev:
            for stmt in self._force_cascade_sql():
                await self.session.execute(text(stmt), {"eid": user_id})

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

        # Inlined delete (instead of BaseService.delete_by_id, which raises the
        # success HTTPException immediately): the orphaned person row must be
        # removed AFTER the employee delete commits, or the FK blocks it.
        person_id = record.person_id
        try:
            await self.repository.delete_by_id(user_id)
        except IntegrityError:
            raise await self._resolve_domain_error(EmployeeDeleteError(record.name))

        if person_id is not None:
            await self.session.execute(
                text(
                    "DELETE FROM persons WHERE id = :pid AND NOT EXISTS "
                    "(SELECT 1 FROM employees WHERE person_id = :pid)"
                ),
                {"pid": person_id},
            )
            await self.session.commit()

        success = EmployeeDeleteSuccess(record.name)
        await self._raise_success(
            message_key=success.message_key,
            variables=success.template_vars,
            fallback=success.fallback,
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
        self, user_id: int, user_group_ids: list[int]
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
