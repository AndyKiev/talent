from typing import Optional, List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.review_session_employee.review_session_employee_repository import (
    ReviewSessionEmployeeRepository,
)
from backend.api_v1.review_session_employee.review_session_employee_model import (
    ReviewSessionEmployee as RSEModel,
)
from backend.api_v1.review_session_employee.review_session_employee_schema import (
    ReviewSessionEmployee as RSESchema,
    ReviewSessionEmployeeList as RSEListSchema,
    ReviewSessionEmployeeFieldsUpdate,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee.employee_model import Employee
from backend.api_v1.employee.employee_errors import EmployeeNotFound
from backend.api_v1.review_session.review_session_repository import (
    ReviewSessionRepository,
)
from backend.api_v1.review_session.review_session_model import ReviewSession
from backend.api_v1.review_session.review_session_errors import ReviewSessionNotFound
from backend.api_v1.review_dimension.review_dimension_model import ReviewDimension
from backend.api_v1.review_session_employee_evaluation.review_session_employee_evaluation_model import (
    ReviewSessionEmployeeEvaluation,
)
from backend.api_v1.review_session_employee.review_session_employee_errors import (
    ReviewSessionEmployeeNotFound,
    ReviewSessionEmployeeStatusError,
    ReviewSessionEmployeeAlreadyInSession,
    ReviewSessionNotOpenForAdd,
    ReviewSessionReorderNotAllowed,
    ProposedLevelRequiredForReview,
    ProposedLevelDetailsIncomplete,
)
from backend.api_v1.review_session_employee.review_session_employee_success import (
    ReviewSessionEmployeeStatusChangeSuccess,
    ReviewSessionEmployeeAddedSuccess,
    ReviewSessionEmployeeQueueOrderSuccess,
)
from backend.api_v1.process_roles.process_role_holder_employee_link.process_role_holder_employee_link_repository import (
    ProcessRoleHolderEmployeeLinkRepository,
)
from backend.api_v1.process_roles.process_role_holder_employee_link.process_role_holder_employee_link_service import (
    ProcessRoleHolderEmployeeLinkService,
)
from backend.api_v1.process_roles.process_role_holder_department_link.process_role_holder_department_link_repository import (
    ProcessRoleHolderDepartmentLinkRepository,
)
from backend.api_v1.process_roles.process_role_holder_department_link.process_role_holder_department_link_service import (
    ProcessRoleHolderDepartmentLinkService,
)
from backend.api_v1.process_roles.process_role_active_context.process_role_active_context_repository import (
    ProcessRoleActiveContextRepository,
)
from backend.api_v1.process_roles.process_role.process_role_repository import (
    ProcessRoleRepository,
)
from backend.api_v1.department.department_repository import DepartmentRepository
from backend.api_v1.employee_department.employee_department_repository import (
    EmployeeDepartmentRepository,
)

# people_review visibility scope (§9): roles are switchable MODES per user. With no
# mode on the user sees only self; a mode on expands to its scope (employee roster
# or department subtree). The active mode is read from process_role_active_contexts.
PEOPLE_REVIEW_PROCESS_KEY = "people_review"

RSE_VALID_TRANSITIONS = {
    "open": ["reviewed"],
    "reviewed": ["closed"],
    "closed": [],
}

# Revert goes one step backward
RSE_REVERT_TRANSITIONS = {
    "reviewed": "open",
    "closed": "reviewed",
}

# Raw status value -> translation key, so the status word inside status-change
# success messages is localized (reuses the same keys the frontend chips use).
RSE_STATUS_LABEL_KEYS = {
    "open": "statusOpen",
    "reviewed": "statusReviewed",
    "closed": "statusClosed",
}


class ReviewSessionEmployeeService(BaseService):
    def __init__(
        self,
        repository: ReviewSessionEmployeeRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int):
        result = await self.repository.get_by_id(id)
        if not result:
            exc = ReviewSessionEmployeeNotFound(id)
            raise await self._resolve_domain_error(exc)
        return result

    def _to_schema(self, record) -> RSESchema:
        schema = RSESchema.model_validate(record)
        emp = record.employee
        if emp:
            schema.employee_name = emp.name
            schema.employee_code = emp.code
            # Header facts (mirror the former GET /employees/{id} the FE used):
            # all are selectin-loaded 1:1 mirrors / relationships on Employee.
            schema.current_level_id = emp.current_level_id
            schema.birth_date = emp.birth_date
            schema.hire_date = emp.hire_date
            schema.job_assigned_date = emp.job_assigned_date
            schema.sex = emp.sex
            schema.marital_status = emp.marital_status
            schema.job_name = emp.job.name if emp.job else None
            main_link = emp.departments[0] if emp.departments else None
            schema.main_department_name = (
                main_link.department.name
                if main_link and main_link.department
                else None
            )
        if record.session:
            schema.session_name = record.session.name
            schema.session_status = record.session.status
        return schema

    def _to_list_schema(self, record) -> RSEListSchema:
        schema = RSEListSchema.model_validate(record)
        if record.employee:
            schema.employee_name = record.employee.name
            schema.employee_code = record.employee.code
        evals = getattr(record, "evaluations", []) or []
        schema.scored_count = sum(
            1 for e in evals if e.score is not None and e.score > 0
        )
        schema.facts_count = sum(1 for e in evals if e.facts and e.facts.strip())
        schema.total_dimensions = len(evals)
        # queue_position is filled by get_session_employees from the reviewer's
        # roster order (the shared order_position store), not from the RSE row.
        return schema

    async def is_employee_visible(self, employee_id: int) -> bool:
        """Public predicate: may the current user see this employee's data in
        people-review (self + active-mode scope)? Used by the people-review
        access guard so embedded sub-resource reads (trainings, ...) match the
        review-record visibility the user already has."""
        return employee_id in await self._visible_employee_ids()

    async def _visible_employee_ids(self) -> set[int]:
        """Employee ids the current user may see in people-review (§9).

        Own record is always visible (LOCKED). Beyond that, visibility is gated by
        the user's ACTIVE MODE (process_role_active_contexts):
          - no mode on              -> self only
          - mode role.link_target == 'employee' (oversight) -> + linked-employee roster
          - mode role.link_target == 'department' (supervision) -> + employees whose
            MAIN department is the selected department or any descendant of it
        The roster/department resolvers match on holder_employee_id == self, so a
        stale context for a role the user no longer holds collapses to self only."""
        if not self.user:
            return set()
        visible = {self.user.id}

        ctx = await ProcessRoleActiveContextRepository(
            session=self.session
        ).get_for_employee(self.user.id)
        if ctx is None or ctx.process_role_id is None:
            return visible  # no mode on -> self only

        role = await ProcessRoleRepository(session=self.session).get_by_id(
            ctx.process_role_id
        )
        if role is None:
            return visible

        if role.link_target == "department":
            dept_id = ctx.department_id
            if dept_id is None:
                return visible  # supervision on but no department picked yet
            dept_service = ProcessRoleHolderDepartmentLinkService(
                repository=ProcessRoleHolderDepartmentLinkRepository(
                    session=self.session
                ),
                user=self.user,
                session=self.session,
            )
            assigned = await dept_service.get_department_ids(
                self.user.id, PEOPLE_REVIEW_PROCESS_KEY, role.key
            )
            if dept_id not in assigned:
                return visible  # not the user's department -> self only
            subtree = {dept_id} | await DepartmentRepository(
                session=self.session
            ).get_descendant_ids(dept_id)
            visible |= await EmployeeDepartmentRepository(
                session=self.session
            ).get_main_employee_ids_in_departments(subtree)
        else:
            roster_service = ProcessRoleHolderEmployeeLinkService(
                repository=ProcessRoleHolderEmployeeLinkRepository(
                    session=self.session
                ),
                user=self.user,
                session=self.session,
            )
            visible |= await roster_service.get_roster_employee_ids(
                self.user.id, PEOPLE_REVIEW_PROCESS_KEY, role.key
            )
        return visible

    async def get_active_role(self):
        """The current user's ACTIVE people-review role (ProcessRole) or None.

        None == 'only myself' mode (no active context / no role). Used by the
        comment service to classify the viewer as oversight (link_target
        'employee') vs supervision (link_target 'department')."""
        if not self.user:
            return None
        ctx = await ProcessRoleActiveContextRepository(
            session=self.session
        ).get_for_employee(self.user.id)
        if ctx is None or ctx.process_role_id is None:
            return None
        return await ProcessRoleRepository(session=self.session).get_by_id(
            ctx.process_role_id
        )

    async def assert_rse_visible(self, rse_id: int) -> None:
        """Visibility guard for RSE sub-resources (evaluations, proposed level):
        if the record EXISTS but its employee is outside the caller's people-review
        scope, raise NotFound (404, not 403) so we don't leak that it exists. A
        missing rse_id is left for the caller to handle (returns empty/None), since
        there is nothing to leak. Called by the evaluation / proposed-level services
        so a typed-in out-of-scope URL can't pull another employee's review data."""
        rse = await self.session.get(RSEModel, rse_id)
        if rse is None:
            return
        visible = await self._visible_employee_ids()
        if rse.employee_id not in visible:
            raise await self._resolve_domain_error(
                ReviewSessionEmployeeNotFound(rse_id)
            )

    async def get_rse_detail_by_session_employee(
        self, session_id: int, employee_id: int
    ) -> RSESchema:
        """Resolve a single review record by (session, employee) for the nested
        /people_review/{session_id}/employee/{employee_id} route. Gated by the same
        visibility resolver as get_rse_detail: a non-existent record AND an
        out-of-scope employee both raise NotFound (no existence leak)."""
        record = await self.session.scalar(
            select(RSEModel).where(
                RSEModel.session_id == session_id,
                RSEModel.employee_id == employee_id,
            )
        )
        visible = await self._visible_employee_ids()
        if record is None or record.employee_id not in visible:
            raise await self._resolve_domain_error(
                ReviewSessionEmployeeNotFound(record.id if record else employee_id)
            )
        # Re-fetch so employee + session relationships are selectin-loaded for _to_schema.
        record = await self.repository.get_by_id(record.id)
        return self._to_schema(record)

    async def get_session_employees(
        self,
        session_id: int,
        status: Optional[str] = None,
        sort: Optional[str] = None,
    ) -> List[RSEListSchema]:
        filters = {"session_id": session_id}
        if status:
            filters["status"] = status
        records = await self.get_all(params=filters, sort_json=sort)
        visible = await self._visible_employee_ids()
        # In a role mode (oversight / supervision) a reviewer doesn't review
        # themselves, so self is dropped from the roster. In "only myself" mode
        # (no active role) self stays — that's how a role holder reaches and edits
        # their own data. Own review is also reachable via "My reviews" ->
        # get_rse_detail (guarded by _visible_employee_ids, which always keeps self).
        ctx = (
            await ProcessRoleActiveContextRepository(
                session=self.session
            ).get_for_employee(self.user.id)
            if self.user
            else None
        )
        in_role_mode = ctx is not None and ctx.process_role_id is not None
        self_id = self.user.id if self.user else None
        result = [
            self._to_list_schema(r)
            for r in records
            if r.employee_id in visible
            and not (in_role_mode and r.employee_id == self_id)
        ]
        # Presentation order = the reviewer's SINGLE roster order (order_position on
        # the holder's employee links), shared with the admin reviewer screen — one
        # order per reviewer, shown everywhere. We surface it on queue_position for
        # the frontend, then sort: ordered employees first (asc), the rest by id.
        # NULL sorts last, so a freshly-added employee lands at the end. This order
        # also drives the evaluation page's prev/next navigation (same query).
        order_map = await self._roster_order_map()
        for s in result:
            s.queue_position = order_map.get(s.employee_id)
        result.sort(
            key=lambda s: (s.queue_position is None, s.queue_position or 0, s.id)
        )
        return result

    async def _roster_order_map(self) -> dict[int, int]:
        """{employee_id: order_position} for the current user's people-review
        oversight roster, or empty when the user isn't an oversight reviewer. The
        single source of truth for presentation order (same store the admin screen
        edits)."""
        role = await self.get_active_role()
        if role is None or role.link_target != "employee" or not self.user:
            return {}
        link_service = ProcessRoleHolderEmployeeLinkService(
            repository=ProcessRoleHolderEmployeeLinkRepository(session=self.session),
            user=self.user,
            session=self.session,
        )
        holder_id = await link_service.get_holder_id(
            self.user.id, PEOPLE_REVIEW_PROCESS_KEY, role.key
        )
        if holder_id is None:
            return {}
        return await link_service.get_employee_order_map(holder_id)

    async def add_employee(
        self, session_id: int, employee_id: int
    ) -> MutationResponse[RSEListSchema]:
        """Enroll one employee into an already-open session: create the RSE row
        plus an empty evaluation per active dimension (same shape open_session
        produces in bulk). Rejected if the session isn't open or the employee is
        already enrolled."""
        session_rec = await ReviewSessionRepository(session=self.session).get_by_id(
            session_id
        )
        if session_rec is None:
            raise await self._resolve_domain_error(ReviewSessionNotFound(session_id))
        if session_rec.status != "open":
            raise await self._resolve_domain_error(
                ReviewSessionNotOpenForAdd(session_rec.status)
            )

        employee = await self.session.get(Employee, employee_id)
        if employee is None:
            raise await self._resolve_domain_error(EmployeeNotFound(employee_id))

        existing = await self.session.scalar(
            select(RSEModel).where(
                RSEModel.session_id == session_id,
                RSEModel.employee_id == employee_id,
            )
        )
        if existing is not None:
            raise await self._resolve_domain_error(
                ReviewSessionEmployeeAlreadyInSession(employee.name)
            )

        rse = RSEModel(session_id=session_id, employee_id=employee_id, status="open")
        self.session.add(rse)
        await self.session.flush()

        dims = (
            await self.session.scalars(
                select(ReviewDimension).where(ReviewDimension.is_active == True)
            )
        ).all()
        for dim in dims:
            self.session.add(
                ReviewSessionEmployeeEvaluation(
                    review_session_employee_id=rse.id, dimension_id=dim.id
                )
            )
        await self.session.commit()

        # Re-fetch so employee + evaluations relationships are selectin-loaded.
        record = await self.repository.get_by_id(rse.id)
        schema = self._to_list_schema(record)
        detail = await self._resolve_domain_success(
            ReviewSessionEmployeeAddedSuccess(employee.name)
        )
        return MutationResponse(detail=detail, data=schema)

    async def set_queue_order(
        self, session_id: int, ordered_ids: List[int]
    ) -> MutationResponse[None]:
        """Persist a session reorder into the reviewer's SINGLE roster order
        (oversight only) — the same order_position store the admin reviewer screen
        edits, so reordering here is reflected everywhere.

        Guarded to oversight mode (active role link_target='employee'). The payload
        is RSE ids; we translate them to employee ids, drop any outside the caller's
        visible roster, and renumber the holder's roster links so those employees
        come first (10, 20, 30 …) followed by roster members not in this session."""
        role = await self.get_active_role()
        if role is None or role.link_target != "employee" or not self.user:
            raise await self._resolve_domain_error(ReviewSessionReorderNotAllowed())

        visible = await self._visible_employee_ids()
        rows = await self.session.scalars(
            select(RSEModel).where(RSEModel.session_id == session_id)
        )
        rse_to_emp = {r.id: r.employee_id for r in rows.all()}
        ordered_employee_ids = [
            rse_to_emp[rid]
            for rid in ordered_ids
            if rid in rse_to_emp and rse_to_emp[rid] in visible
        ]

        link_service = ProcessRoleHolderEmployeeLinkService(
            repository=ProcessRoleHolderEmployeeLinkRepository(session=self.session),
            user=self.user,
            session=self.session,
        )
        holder_id = await link_service.get_holder_id(
            self.user.id, PEOPLE_REVIEW_PROCESS_KEY, role.key
        )
        if holder_id is None:
            raise await self._resolve_domain_error(ReviewSessionReorderNotAllowed())
        await link_service.set_session_order(holder_id, ordered_employee_ids)

        detail = await self._resolve_domain_success(
            ReviewSessionEmployeeQueueOrderSuccess()
        )
        return MutationResponse(detail=detail, data=None)

    async def _tempo_photo_enabled(self, *, individual: bool) -> bool:
        """Effective photo flag for a TEMPO artifact: the individual-album child
        for single sheets (pdf/png/html), the session-deck child for the
        presentation. Each is AND-ed with the master by get_effective_bool_setting,
        so the master switch (and a per-surface off) both hide the photo."""
        from backend.api_v1.app_setting.app_setting_service import (
            get_effective_bool_setting,
        )
        from backend.api_v1.employee_photo.employee_photo_service import (
            PHOTOS_PRESENTATION_INDIVIDUAL_KEY,
            PHOTOS_PRESENTATION_SESSION_KEY,
        )

        key = (
            PHOTOS_PRESENTATION_INDIVIDUAL_KEY
            if individual
            else PHOTOS_PRESENTATION_SESSION_KEY
        )
        return await get_effective_bool_setting(self.session, key, default=True)

    async def build_tempo_pdf(self, rse_id: int) -> bytes:
        """TEMPO album as PDF bytes (download artifact)."""
        from backend.api_v1.review_session_employee.tempo_pdf import build_tempo_pdf

        photo_enabled = await self._tempo_photo_enabled(individual=True)
        return build_tempo_pdf(await self._tempo_data(rse_id, photo_enabled))

    async def build_tempo_png(self, rse_id: int) -> bytes:
        """TEMPO album as PNG bytes (inline viewer — renders in any browser)."""
        from backend.api_v1.review_session_employee.tempo_pdf import render_tempo_png

        photo_enabled = await self._tempo_photo_enabled(individual=True)
        return render_tempo_png(await self._tempo_data(rse_id, photo_enabled))

    async def build_tempo_html(self, rse_id: int) -> str:
        """TEMPO album as a self-contained HTML page (one employee)."""
        from backend.api_v1.review_session_employee.tempo_html import render_tempo_html

        photo_enabled = await self._tempo_photo_enabled(individual=True)
        return render_tempo_html(await self._tempo_data(rse_id, photo_enabled))

    async def build_tempo_presentation(self, session_id: int) -> str:
        """Presentation HTML: every employee the current user can see in the
        session, in the user's roster order, with ◀ ▶ navigation. Reuses the
        ordered list the session screen shows."""
        from backend.api_v1.review_session_employee.tempo_html import (
            render_tempo_presentation,
        )

        # Resolve the session-deck photo flag ONCE for the whole deck (not per row).
        photo_enabled = await self._tempo_photo_enabled(individual=False)
        ordered = await self.get_session_employees(session_id=session_id)
        sheets = [await self._tempo_data(rse.id, photo_enabled) for rse in ordered]
        return render_tempo_presentation(sheets)

    async def _tempo_data(self, rse_id: int, photo_enabled: bool = True) -> dict:
        """Gather this review's data into the flat dict the TEMPO album builder
        expects. Visibility-gated like the detail page (out-of-scope -> NotFound).
        Missing data is left as a placeholder in the album by design — the user
        fills gaps after seeing the first draft. ``photo_enabled`` (resolved once
        by the caller from the matching per-surface child flag) decides whether the
        photo blob is read at all."""
        from datetime import date as _date
        from backend.api_v1.employee_education.employee_education_model import (
            EmployeeEducation,
        )
        from backend.api_v1.employee_child.employee_child_model import EmployeeChild

        record = await self.get_by_id(rse_id)
        visible = await self._visible_employee_ids()
        if record.employee_id not in visible:
            raise await self._resolve_domain_error(
                ReviewSessionEmployeeNotFound(rse_id)
            )

        emp = record.employee
        emp_id = record.employee_id

        # Age from birth date; children summary from child birth dates.
        today = _date.today()
        birth = getattr(emp, "birth_date", None)
        age = None
        if birth:
            age = (
                today.year
                - birth.year
                - ((today.month, today.day) < (birth.month, birth.day))
            )
        children_rows = (
            await self.session.scalars(
                select(EmployeeChild).where(EmployeeChild.employee_id == emp_id)
            )
        ).all()
        children = None
        if children_rows:
            ages = sorted((today.year - c.birth_date.year) for c in children_rows)
            children = ", ".join(f"{a} р." for a in ages)

        education = await self.session.scalar(
            select(EmployeeEducation)
            .where(EmployeeEducation.employee_id == emp_id)
            .order_by(EmployeeEducation.graduation_year.desc())
        )
        education_str = None
        if education:
            parts = [p for p in (education.speciality, education.institution) if p]
            if education.graduation_year:
                parts.append(str(education.graduation_year))
            education_str = ", ".join(parts)

        # Foreign languages: "English B2, French A1" from the employee's profile.
        from backend.api_v1.employee_language_profile.employee_language_profile_model import (
            EmployeeLanguageProfile,
        )

        lang_profile = await self.session.scalar(
            select(EmployeeLanguageProfile).where(
                EmployeeLanguageProfile.employee_id == emp_id
            )
        )
        lang_level = None
        if lang_profile and lang_profile.languages:
            parts = []
            for lng in lang_profile.languages:
                # Language name is a translation key ("english"/"french") — resolve
                # to the viewer's language, same as the frontend review page.
                lname = await self._translate(lng.language, fallback=lng.language)
                parts.append(f"{lname} {lng.level.code}" if lng.level else lname)
            lang_level = ", ".join(parts)

        # Competence levels for the bar chart — the FRACTIONAL mean (same value the
        # UI shows: average of behaviour scores), not the rounded integer score.
        competences = []
        # dimension_key -> (translated name, color), used to label the strong /
        # to-develop competence summaries (and color them like the bar chart).
        dim_meta: dict[str, tuple[str, str]] = {}
        eval_dims = []
        for ev in getattr(record, "evaluations", []) or []:
            dim = await self.session.get(ReviewDimension, ev.dimension_id)
            eval_dims.append((ev, dim))
        # Same order as everywhere else: dimension sort_order (id as tiebreak).
        for ev, dim in sorted(
            eval_dims,
            key=lambda pair: (
                pair[1].sort_order if pair[1] else 0,
                pair[0].dimension_id,
            ),
        ):
            raw_name = (dim.name if dim else None) or f"#{ev.dimension_id}"
            # Translate via the frontend convention competence<PascalKey>
            # (PEOPLE_PLANET -> competencePeoplePlanet), DB name as fallback.
            if dim and dim.key:
                name = await self._translate(
                    f"competence{self._pascal_dim_key(dim.key)}", fallback=raw_name
                )
            else:
                name = raw_name
            color = dim.color if dim else "#1565C0"
            if dim and dim.key:
                dim_meta[dim.key] = (name, color)
            # Competence level = the LIVE mean of the per-descriptor (criterion)
            # star ratings, exactly like the frontend graph (evalMean). The stored
            # mean_score/score can be stale or rounded (e.g. seeded as the whole
            # score), so the criterion scores — the same source the UI averages —
            # win when present; mean_score then score are only fallbacks.
            crit = [
                cs.score
                for cs in (getattr(ev, "criterion_scores", None) or [])
                if cs.score is not None
            ]
            if crit:
                value = sum(crit) / len(crit)
            elif ev.mean_score is not None:
                value = ev.mean_score
            else:
                value = ev.score
            competences.append(
                (name, float(value) if value is not None else 0.0, color)
            )

        # Photo bytes (1:1 blob table, no ORM relationship -> direct query). Read
        # only when photos are enabled for THIS artifact (the caller resolved the
        # matching per-surface child flag once); otherwise the TEMPO PDF/HTML
        # renders its empty-photo placeholder and we never touch the blob.
        from backend.api_v1.employee_photo.employee_photo_model import EmployeePhoto

        photo = None
        if photo_enabled:
            photo = await self.session.scalar(
                select(EmployeePhoto).where(EmployeePhoto.employee_id == emp_id)
            )

        # Levels: current (employee.current_level_id) + proposed (the registration
        # on this review). Level/requirement names are translation keys -> resolve.
        from backend.api_v1.review_level.review_level_model import ReviewLevel
        from backend.api_v1.review_session_employee_level.review_session_employee_level_model import (
            ReviewSessionEmployeeLevel,
        )

        async def _level_name(level_id):
            if not level_id:
                return None
            lvl = await self.session.get(ReviewLevel, level_id)
            if not lvl:
                return None
            return await self._translate(lvl.name_key, fallback=lvl.name_key)

        # Every employee shows a level: fall back to the base level (lowest
        # sort_order, active) when none is set, so the album never shows a blank.
        effective_current_level_id = (
            getattr(emp, "current_level_id", None) if emp else None
        )
        if not effective_current_level_id:
            base_lvl = await self.session.scalar(
                select(ReviewLevel)
                .where(ReviewLevel.is_active.is_(True))
                .order_by(ReviewLevel.sort_order)
                .limit(1)
            )
            effective_current_level_id = base_lvl.id if base_lvl else None
        current_level = await _level_name(effective_current_level_id)

        registration = await self.session.scalar(
            select(ReviewSessionEmployeeLevel).where(
                ReviewSessionEmployeeLevel.review_session_employee_id == rse_id
            )
        )
        proposed_level = None
        proposed_status = None
        level_requirements: list[dict] = []
        if registration:
            proposed_level = await _level_name(registration.level_id)
            # Translate the proposal's lifecycle status to the viewer's language
            # (same keys as the frontend ProposedLevelDrawer / JobInfoPanel), so
            # the HTML/PDF album shows a localized word, not the raw enum value.
            _status_keys = {
                "proposed": "proposedLevelStatusProposed",
                "validated": "proposedLevelStatusValidated",
                "rejected": "proposedLevelStatusRejected",
            }
            _raw_status = registration.status
            proposed_status = (
                await self._translate(_status_keys[_raw_status], fallback=_raw_status)
                if _raw_status in _status_keys
                else _raw_status
            )
            facts_by_req = {
                a.requirement_id: a.facts for a in (registration.answers or [])
            }
            # Render the proposed level's FROZEN requirements (the exact set/order the
            # employee saw in the drawer), falling back to the live active ones for
            # pre-freeze sessions. Frozen requirements expose live ids, so facts_by_req
            # (keyed by live id) matches unchanged.
            from backend.api_v1.review_session_level.review_session_level_helper import (
                frozen_levels_for_session,
            )

            frozen = await frozen_levels_for_session(self.session, record.session_id)
            proposed_frozen = next(
                (l for l in frozen if l.id == registration.level_id), None
            )
            if proposed_frozen is not None:
                reqs = [(r.text_key, r.id) for r in proposed_frozen.requirements]
            else:
                level = await self.session.get(ReviewLevel, registration.level_id)
                reqs = [
                    (r.text_key, r.id)
                    for r in sorted(
                        (level.requirements if level else []),
                        key=lambda r: r.sort_order,
                    )
                    if r.is_active
                ]
            for text_key, req_id in reqs:
                text = await self._translate(text_key, fallback=text_key)
                level_requirements.append(
                    {"text": text, "facts": facts_by_req.get(req_id)}
                )

        # Level "sense" — compares the proposed level against the employee's
        # current one (by sort_order): a higher rank reads as a proposed increase,
        # an equal one as a confirmation, a lower one as a decrease. Only meaningful
        # when BOTH a current and a proposed level exist.
        level_sense = None
        proposed_level_sense = None
        current_level_id = effective_current_level_id
        if registration and current_level_id:
            cur_lvl = await self.session.get(ReviewLevel, current_level_id)
            prop_lvl = await self.session.get(ReviewLevel, registration.level_id)
            if cur_lvl and prop_lvl:
                if prop_lvl.sort_order > cur_lvl.sort_order:
                    level_sense = "increase"
                elif prop_lvl.sort_order < cur_lvl.sort_order:
                    level_sense = "decrease"
                else:
                    level_sense = "same"
                sense_key = {
                    "increase": "levelSenseIncrease",
                    "same": "levelSenseSame",
                    "decrease": "levelSenseDecrease",
                }[level_sense]
                proposed_level_sense = await self._translate(
                    sense_key, fallback=level_sense
                )

        # Gender-aware marital status, resolved to the viewer's language. Keys
        # mirror the frontend (maritalMarriedMale / maritalNotMarriedFemale, …).
        marital_status = None
        ms = getattr(emp, "marital_status", None) if emp else None
        if ms in ("married", "not_married"):
            base = "maritalMarried" if ms == "married" else "maritalNotMarried"
            suffix = "Female" if getattr(emp, "sex", None) == "female" else "Male"
            marital_status = await self._translate(base + suffix, fallback=ms)

        # Tenure (years with the company) from hire date.
        tenure = None
        hire = getattr(emp, "hire_date", None) if emp else None
        if hire:
            tenure = str(
                today.year
                - hire.year
                - ((today.month, today.day) < (hire.month, hire.day))
            )

        # Talent status/period progression (the talent_audit_job rows for this
        # employee — same data as the list-of-persons screen, no interviews).
        # Each row "job · status/period · status"; ordered by period months asc.
        from backend.api_v1.talent_audit.talent_audit_model import TalentAudit
        from backend.api_v1.talent_audit_job.talent_audit_job_model import (
            TalentAuditJob,
        )

        talent_levels: list[str] = []
        audit = await self.session.scalar(
            select(TalentAudit).where(TalentAudit.employee_id == emp_id)
        )
        if audit:
            audit_jobs = (
                await self.session.scalars(
                    select(TalentAuditJob).where(
                        TalentAuditJob.talent_audit_id == audit.id
                    )
                )
            ).all()

            def _job_months(j) -> int:
                link = j.talent_status_period_link
                return (
                    link.talent_period.qty_months if link and link.talent_period else 0
                )

            for j in sorted(audit_jobs, key=_job_months):
                # Skip "nomination" (applied) and "skipped" rows. A nomination
                # targets the employee's CURRENT job, so it only restates the
                # position already shown above; a skipped row is no longer a
                # live target — neither belongs in the album.
                if j.status and j.status.key in ("applied", "skipped"):
                    continue
                link = j.talent_status_period_link
                status_period = (
                    f"{link.talent_status.key} - {link.talent_period.name}"
                    if link and link.talent_status and link.talent_period
                    else None
                )
                parts = [
                    p
                    for p in (
                        j.target_job.name if j.target_job else None,
                        status_period,
                        j.status.name if j.status else None,
                    )
                    if p
                ]
                if parts:
                    talent_levels.append(" · ".join(parts))
        talent_levels_str = "; ".join(talent_levels) if talent_levels else None

        # Structured strong / to-develop competence summaries for the HTML album:
        # each item carries the competence NAME + its DB color + its comments, so
        # the renderer can show the named, colored heading (the flat *_text values
        # below stay as-is for the PDF). competence_summary JSON:
        # {"strong":[{"dimension_key","comments":[...]}], "develop":[...]}.
        def _summary_items(bucket: str) -> list[dict]:
            if not record.competence_summary:
                return []
            import json as _json

            try:
                obj = _json.loads(record.competence_summary)
            except (ValueError, TypeError):
                return []
            out = []
            for it in obj.get(bucket) or []:
                key = it.get("dimension_key")
                name, color = dim_meta.get(key, (key, "#1565C0"))
                comments = [
                    str(c) for c in (it.get("comments") or []) if str(c).strip()
                ]
                out.append({"name": name, "color": color, "comments": comments})
            return out

        strengths_items = _summary_items("strong")
        development_items = _summary_items("develop")

        # All section/field labels resolved here so the renderer stays pure (no DB)
        # and nothing in the album is hardcoded.
        label_keys = {
            "competence_level": "competenceLevel",
            "results": "resultsAchievements",
            "not_achieved": "notAchieved",
            "strengths": "strongCompetences",
            "development": "competencesToDevelop",
            "idp": "developmentPlan",
            "training": "requiredTrainings",
            "employee_feedback": "employeeFeedback",
            "manager_feedback": "managerFeedback",
            "birth_age": "birthDate",
            "marital_children": "maritalStatus",
            "children": "childrenAges",
            "position": "job",
            "languages": "foreignLanguages",
            "education": "education",
            "tenure": "tenure",
            "current_level": "currentLevel",
            "proposed_level": "proposedLevel",
            "talent_status_period": "talentStatusPeriod",
            "level_requirements": "levelRequirements",
        }
        labels = {
            slot: await self._translate(key, fallback=key)
            for slot, key in label_keys.items()
        }

        data = {
            "full_name": emp.name if emp else "",
            "birth_date": birth.strftime("%d.%m.%Y") if birth else None,
            "age": str(age) if age is not None else None,
            "marital_status": marital_status,
            "children": children,
            "position": emp.job.name if emp and emp.job else None,
            "education": education_str,
            "lang_level": lang_level,
            "tenure": tenure,
            "competences": competences,
            "max_grade": 4,
            "current_level": current_level,
            "proposed_level": proposed_level,
            "talent_levels": talent_levels_str,
            "proposed_level_status": proposed_status,
            "proposed_level_sense": proposed_level_sense,
            "level_sense": level_sense,
            "has_level_registration": registration is not None,
            "level_requirements": level_requirements,
            "results_achievements": record.results_achievements,
            "not_achieved": None,
            "employee_feedback": record.employee_feedback,
            "manager_feedback": record.manager_feedback,
            "training_done": record.trainings,
            "idp_missions": self._development_missions(
                record.development_plan, dim_meta
            ),
            "strengths": self._competence_summary_text(
                record.competence_summary, "strong"
            ),
            "development_directions": self._competence_summary_text(
                record.competence_summary, "develop"
            ),
            # Named + colored variants for the HTML album.
            "strengths_items": strengths_items,
            "development_items": development_items,
            "labels": labels,
            "photo": photo.data if photo else None,
            "photo_mime": photo.content_type if photo else None,
        }
        return data

    @staticmethod
    def _pascal_dim_key(key: str) -> str:
        """PEOPLE_PLANET -> PeoplePlanet (frontend competence-key convention)."""
        return "".join(part.capitalize() for part in str(key).split("_") if part)

    @staticmethod
    def _development_missions(
        development_plan: Optional[str],
        dim_meta: dict[str, tuple[str, str]],
    ) -> list[dict]:
        """development_plan is a JSON array of missions. Accepts BOTH the legacy
        shape (plain strings) and the new shape ({text, kpi, dimension_key}). Returns
        enriched dicts {text, kpi, dimension_key, name, color} so the album can show
        each mission's linked competence in its own color (same as the page)."""
        if not development_plan:
            return []
        import json

        try:
            arr = json.loads(development_plan)
        except (ValueError, TypeError):
            arr = [development_plan]
        if not isinstance(arr, list):
            return []

        out: list[dict] = []
        for item in arr:
            if isinstance(item, dict):
                text = str(item.get("text") or "").strip()
                kpi = str(item.get("kpi") or "").strip()
                key = item.get("dimension_key")
            else:
                text = str(item or "").strip()
                kpi = ""
                key = None
            if not text:
                continue
            name, color = (None, None)
            if key:
                name, color = dim_meta.get(str(key), (None, None))
            out.append(
                {
                    "text": text,
                    "kpi": kpi,
                    "dimension_key": str(key) if key else None,
                    "name": name,
                    "color": color,
                }
            )
        return out

    @staticmethod
    def _competence_summary_text(
        competence_summary: Optional[str], bucket: str
    ) -> Optional[str]:
        """competence_summary is JSON {"strong":[...], "develop":[...]}, each item
        {"dimension_key":..., "comments":[...]}. Flatten one bucket to text."""
        if not competence_summary:
            return None
        import json

        try:
            obj = json.loads(competence_summary)
        except (ValueError, TypeError):
            return None
        items = obj.get(bucket) or []
        lines = []
        for it in items:
            comments = it.get("comments") or []
            for c in comments:
                if str(c).strip():
                    lines.append(f"• {c}")
        return "\n".join(lines) if lines else None

    async def get_my_reviews(
        self,
        employee_id: int,
    ) -> List[RSEListSchema]:
        filters = {"employee_id": employee_id}
        records = await self.get_all(params=filters)
        return [
            self._to_list_schema(r)
            for r in records
            if r.session and r.session.status == "open" and r.status == "open"
        ]

    async def get_my_latest_open(self) -> Optional[RSEListSchema]:
        """The current user's review row in the most-recently-created OPEN session.

        Used by the people-review landing redirect for a role-less user (fills only
        own data): jump straight to this row. Returns None when the user isn't
        listed in any open session. RSE status is irrelevant — even an already
        reviewed/closed row in an open session is the user's data to land on."""
        if not self.user:
            return None
        # NOTE: ReviewSession.status is a plain Python @property (not a hybrid),
        # so it can NOT be used in a SQL where() — filter on the status key via
        # the joined lookup table instead.
        from backend.api_v1.review_session_status.review_session_status_model import (
            ReviewSessionStatus,
        )

        stmt = (
            select(RSEModel)
            .join(ReviewSession, ReviewSession.id == RSEModel.session_id)
            .join(
                ReviewSessionStatus,
                ReviewSessionStatus.id == ReviewSession.status_id,
            )
            .where(
                RSEModel.employee_id == self.user.id,
                ReviewSessionStatus.key == "open",
            )
            .order_by(ReviewSession.created_at.desc())
            .limit(1)
        )
        record = await self.session.scalar(stmt)
        if record is None:
            return None
        return self._to_list_schema(record)

    async def get_rse_detail(self, rse_id: int) -> RSESchema:
        record = await self.get_by_id(rse_id)
        # Visibility guard (§9a): the sensitive feedback lives on the detail, so
        # a record outside the user's scope must be unfetchable by id too.
        # Raise NotFound (not 403) so we don't leak that the record exists.
        visible = await self._visible_employee_ids()
        if record.employee_id not in visible:
            raise await self._resolve_domain_error(
                ReviewSessionEmployeeNotFound(rse_id)
            )
        return self._to_schema(record)

    async def update_fields(
        self, rse_id: int, payload: ReviewSessionEmployeeFieldsUpdate
    ) -> RSESchema:
        record = await self.get_by_id(rse_id)
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(record, field, value)
        await self.session.commit()
        await self.session.refresh(record)
        return self._to_schema(record)

    async def _status_label(self, status_value: str) -> str:
        """Localized label for a raw RSE status value (falls back to the raw value)."""
        key = RSE_STATUS_LABEL_KEYS.get(status_value)
        if not key:
            return status_value
        return await self._translate(key, fallback=status_value)

    async def _validate_level_for_review(self, record) -> None:
        """Gate the open→reviewed transition on the level decision.

        - No current level on the employee → nothing required (a fresh hire has
          no level to confirm or change yet).
        - Current level present → a proposed level registration is mandatory.
        - Proposing the SAME or a HIGHER level → every active requirement of the
          proposed level must be justified (≥1 fact). A LOWER (decrease) proposal
          needs no requirement details.
        """
        from backend.api_v1.review_level.review_level_model import ReviewLevel
        from backend.api_v1.review_session_employee_level.review_session_employee_level_model import (
            ReviewSessionEmployeeLevel,
        )

        emp = record.employee
        current_level_id = getattr(emp, "current_level_id", None) if emp else None
        if not current_level_id:
            return

        registration = await self.session.scalar(
            select(ReviewSessionEmployeeLevel).where(
                ReviewSessionEmployeeLevel.review_session_employee_id == record.id
            )
        )
        if registration is None:
            raise await self._resolve_domain_error(ProposedLevelRequiredForReview())

        current = await self.session.get(ReviewLevel, current_level_id)
        proposed = await self.session.get(ReviewLevel, registration.level_id)
        # A decrease (lower sort_order) skips the requirement-detail check.
        is_decrease = (
            current is not None
            and proposed is not None
            and proposed.sort_order < current.sort_order
        )
        if is_decrease:
            return

        # Count against the proposed level's FROZEN requirement set (exactly what the
        # employee saw in the drawer), so deactivating a live requirement mid-session
        # can't let the gate pass short. Falls back to live active requirements for
        # pre-freeze sessions.
        from backend.api_v1.review_session_level.review_session_level_helper import (
            frozen_levels_for_session,
        )

        frozen = await frozen_levels_for_session(self.session, record.session_id)
        proposed_frozen = next(
            (l for l in frozen if l.id == registration.level_id), None
        )
        required_req_ids = (
            [r.id for r in proposed_frozen.requirements]
            if proposed_frozen is not None
            else [
                r.id for r in (proposed.requirements if proposed else []) if r.is_active
            ]
        )
        answered = {
            a.requirement_id
            for a in (registration.answers or [])
            if (a.facts or "").strip()
        }
        if any(rid not in answered for rid in required_req_ids):
            raise await self._resolve_domain_error(ProposedLevelDetailsIncomplete())

    async def change_status(
        self, rse_id: int, target_status: str
    ) -> MutationResponse[RSESchema]:
        record = await self.get_by_id(rse_id)
        valid = RSE_VALID_TRANSITIONS.get(record.status, [])
        if target_status not in valid:
            exc = ReviewSessionEmployeeStatusError(record.status, target_status)
            raise await self._resolve_domain_error(exc)

        # open → reviewed: a level decision is mandatory once the employee has a
        # current level (confirm it or propose a change). Enforced here — the
        # single transition point — so the session-list shortcut can't bypass it.
        if record.status == "open" and target_status == "reviewed":
            await self._validate_level_for_review(record)

        record.status = target_status
        await self.session.commit()
        await self.session.refresh(record)

        schema = self._to_schema(record)
        emp_name = record.employee.name if record.employee else str(rse_id)
        detail = await self._resolve_domain_success(
            ReviewSessionEmployeeStatusChangeSuccess(
                emp_name, await self._status_label(target_status)
            )
        )
        return MutationResponse(detail=detail, data=schema)

    async def reopen(self, rse_id: int) -> MutationResponse[RSESchema]:
        """Force status directly to 'open' from any non-open state."""
        record = await self.get_by_id(rse_id)
        if record.status == "open":
            exc = ReviewSessionEmployeeStatusError(record.status, "open")
            raise await self._resolve_domain_error(exc)

        record.status = "open"
        await self.session.commit()
        await self.session.refresh(record)

        schema = self._to_schema(record)
        emp_name = record.employee.name if record.employee else str(rse_id)
        detail = await self._resolve_domain_success(
            ReviewSessionEmployeeStatusChangeSuccess(
                emp_name, await self._status_label("open")
            )
        )
        return MutationResponse(detail=detail, data=schema)

    async def revert_status(self, rse_id: int) -> MutationResponse[RSESchema]:
        record = await self.get_by_id(rse_id)
        target = RSE_REVERT_TRANSITIONS.get(record.status)
        if target is None:
            exc = ReviewSessionEmployeeStatusError(record.status, "revert")
            raise await self._resolve_domain_error(exc)

        record.status = target
        await self.session.commit()
        await self.session.refresh(record)

        schema = self._to_schema(record)
        emp_name = record.employee.name if record.employee else str(rse_id)
        detail = await self._resolve_domain_success(
            ReviewSessionEmployeeStatusChangeSuccess(
                emp_name, await self._status_label(target)
            )
        )
        return MutationResponse(detail=detail, data=schema)
