from typing import NamedTuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.department.department_repository import DepartmentRepository
from backend.api_v1.employee.employee_messages import EmployeeNotFound
from backend.api_v1.employee.employee_model import Employee
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_department.employee_department_repository import (
    EmployeeDepartmentRepository,
)
from backend.api_v1.employee_fact.employee_fact_repository import EmployeeFactRepository
from backend.api_v1.employee_fact_type.employee_fact_type_model import FACT
from backend.api_v1.process_roles.process_role.process_role_model import (
    ProcessRole,
)
from backend.api_v1.process_roles.process_role_active_context.process_role_active_context_repository import (
    ProcessRoleActiveContextRepository,
)
from backend.api_v1.process_roles.process_role_holder_department_link.process_role_holder_department_link_repository import (
    ProcessRoleHolderDepartmentLinkRepository,
)
from backend.api_v1.process_roles.process_role_holder_department_link.process_role_holder_department_link_service import (
    ProcessRoleHolderDepartmentLinkService,
)
from backend.api_v1.process_roles.process_role_holder_employee_link.process_role_holder_employee_link_repository import (
    ProcessRoleHolderEmployeeLinkRepository,
)
from backend.api_v1.process_roles.process_role_holder_employee_link.process_role_holder_employee_link_service import (
    ProcessRoleHolderEmployeeLinkService,
)
from backend.api_v1.review_dimension.review_dimension_messages import (
    ReviewDimensionNotFound,
)
from backend.api_v1.review_dimension.review_dimension_model import ReviewDimension
from backend.api_v1.review_session.review_session_messages import ReviewSessionNotFound
from backend.api_v1.review_session.review_session_model import ReviewSession
from backend.api_v1.review_session.review_session_repository import (
    ReviewSessionRepository,
)
from backend.api_v1.review_session_employee.review_session_employee_messages import (
    ProposedLevelDetailsIncomplete,
    ProposedLevelRequiredForReview,
    ReviewSessionEmployeeAddedSuccess,
    ReviewSessionEmployeeAlreadyInSession,
    ReviewSessionEmployeeFeedbackTypeNotFound,
    ReviewSessionEmployeeNotFound,
    ReviewSessionEmployeeNotHuman,
    ReviewSessionEmployeeQueueOrderSuccess,
    ReviewSessionEmployeeStatusChangeSuccess,
    ReviewSessionEmployeeStatusError,
    ReviewSessionEmployeeStatusKeyNotFound,
    ReviewSessionNotOpenForAdd,
    ReviewSessionReorderNotAllowed,
)
from backend.api_v1.review_session_employee.review_session_employee_model import (
    ReviewSessionEmployee as RSEModel,
)
from backend.api_v1.review_session_employee.review_session_employee_repository import (
    ReviewSessionEmployeeRepository,
)
from backend.api_v1.review_session_employee.review_session_employee_schema import (
    ReviewSessionEmployee as RSESchema,
)
from backend.api_v1.review_session_employee.review_session_employee_schema import (
    ReviewSessionEmployeeFieldsUpdate,
    RseDimensionItem,
    RseDimensionsUpdate,
    RseFeedbackItem,
    RseFeedbacksUpdate,
    RseResultItem,
    RseResultsUpdate,
)
from backend.api_v1.review_session_employee.review_session_employee_schema import (
    ReviewSessionEmployeeList as RSEListSchema,
)
from backend.api_v1.review_session_employee_dimension.review_session_employee_dimension_model import (
    ReviewSessionEmployeeDimension,
)
from backend.api_v1.review_session_employee_dimension_comment.review_session_employee_dimension_comment_model import (
    ReviewSessionEmployeeDimensionComment,
)
from backend.api_v1.review_session_employee_dimension_type.review_session_employee_dimension_type_messages import (
    ReviewSessionEmployeeDimensionTypeNotFound,
)
from backend.api_v1.review_session_employee_dimension_type.review_session_employee_dimension_type_model import (
    DEVELOP,
    STRONG,
    ReviewSessionEmployeeDimensionType,
)
from backend.api_v1.review_session_employee_evaluation.review_session_employee_evaluation_messages import (
    EvaluationNotEditable,
)
from backend.api_v1.review_session_employee_evaluation.review_session_employee_evaluation_model import (
    ReviewSessionEmployeeEvaluation,
)
from backend.api_v1.review_session_employee_feedback.review_session_employee_feedback_model import (
    ReviewSessionEmployeeFeedback,
)
from backend.api_v1.review_session_employee_feedback_type.review_session_employee_feedback_type_model import (
    EMPLOYEE as FEEDBACK_EMPLOYEE,
)
from backend.api_v1.review_session_employee_feedback_type.review_session_employee_feedback_type_model import (
    MANAGER as FEEDBACK_MANAGER,
)
from backend.api_v1.review_session_employee_feedback_type.review_session_employee_feedback_type_model import (
    ReviewSessionEmployeeFeedbackType,
)
from backend.api_v1.review_session_employee_result.review_session_employee_result_model import (
    ReviewSessionEmployeeResult,
)
from backend.api_v1.review_session_employee_status.review_session_employee_status_model import (
    OPEN as RSE_OPEN,
)
from backend.api_v1.review_session_employee_status.review_session_employee_status_model import (
    ReviewSessionEmployeeStatus,
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


class _ActiveRoleFields(NamedTuple):
    """The only two scalar ProcessRole columns people-review scoping needs
    (link_target, key). Loaded column-only via _active_role_fields to avoid the
    ProcessRole.holders selectin cascade — see that method."""

    link_target: str
    key: str | None


class ReviewSessionEmployeeService(BaseService):
    def __init__(
        self,
        repository: ReviewSessionEmployeeRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int):
        result = await self.repository.get_by_id(id)
        if not result:
            exc = ReviewSessionEmployeeNotFound(id)
            raise await self._resolve_domain_error(exc)
        return result

    async def _load_rse_dimensions(self, rse_id: int) -> list[RseDimensionItem]:
        """The review's picked competences, both sides, in display order.

        The relationship is lazy="noload" (roster N+1), so every path that
        returns a populated RSESchema calls this explicitly. Ordering is
        (side sort_order, item sort_order) so a consumer can group by type id
        and get the sections in the lookup's own order.

        Names are resolved with the SAME rule the frontend uses for the
        competence tabs — message key `competence` + PascalCase dimension key,
        falling back to the dimension row's own name — so the summary heading and
        the tab heading below it can never disagree.
        """
        stmt = (
            select(ReviewSessionEmployeeDimension)
            .join(ReviewSessionEmployeeDimension.dimension_type)
            .where(ReviewSessionEmployeeDimension.review_session_employee_id == rse_id)
            .order_by(
                ReviewSessionEmployeeDimensionType.sort_order,
                ReviewSessionEmployeeDimension.sort_order,
                ReviewSessionEmployeeDimension.id,
            )
        )
        rows = (await self.session.execute(stmt)).scalars().all()

        out: list[RseDimensionItem] = []
        for row in rows:
            dim = row.dimension
            raw_name = dim.name if dim else ""
            name = (
                await self._translate(
                    f"competence{self._pascal_dim_key(dim.key)}", fallback=raw_name
                )
                if dim and dim.key
                else raw_name
            )
            out.append(
                RseDimensionItem(
                    review_session_employee_dimension_type_id=row.review_session_employee_dimension_type_id,
                    review_session_employee_dimension_type_key=row.dimension_type.key,
                    dimension_id=row.dimension_id,
                    dimension_key=dim.key if dim else "",
                    dimension_name=name,
                    dimension_color=(dim.color if dim else None) or "#1565C0",
                    sort_order=row.sort_order,
                    comments=[c.text for c in row.comments],
                )
            )
        return out

    async def _status_id(self, key: str) -> int:
        """Resolve a lifecycle status BY KEY.

        Every write goes through here rather than storing a string, so a typo is
        a hard failure at the write instead of an unreadable row. Resolved by key
        (not id) so reseeding the lookup cannot silently repoint records.
        """
        status_id = await self.session.scalar(
            select(ReviewSessionEmployeeStatus.id).where(
                ReviewSessionEmployeeStatus.key == key
            )
        )
        if status_id is None:
            raise await self._resolve_domain_error(
                ReviewSessionEmployeeStatusKeyNotFound(key)
            )
        return status_id

    async def _load_rse_feedbacks(self, rse_id: int) -> list[RseFeedbackItem]:
        """This review's feedback rows, one per voice, in lookup order.

        Replaces the `employee_feedback` / `manager_feedback` columns. A voice
        with nothing written simply has NO row — absence is the empty state, so
        there is no nullable column and no empty string to distinguish from it.
        """
        stmt = (
            select(ReviewSessionEmployeeFeedback)
            .join(ReviewSessionEmployeeFeedback.feedback_type)
            .where(ReviewSessionEmployeeFeedback.review_session_employee_id == rse_id)
            .order_by(
                ReviewSessionEmployeeFeedbackType.sort_order,
                ReviewSessionEmployeeFeedback.id,
            )
        )
        rows = (await self.session.execute(stmt)).scalars().all()
        return [
            RseFeedbackItem(
                review_session_employee_feedback_type_id=(
                    r.review_session_employee_feedback_type_id
                ),
                review_session_employee_feedback_type_key=r.feedback_type.key,
                text=r.text,
            )
            for r in rows
        ]

    async def _load_rse_results(self, rse_id: int) -> list[RseResultItem]:
        """This review's results / achievements, in display order.

        Replaces splitting a numbered "1. ...\\n2. ..." blob: the position is a
        column now, so inserting or deleting a line renumbers nothing.
        """
        stmt = (
            select(ReviewSessionEmployeeResult)
            .where(ReviewSessionEmployeeResult.review_session_employee_id == rse_id)
            .order_by(
                ReviewSessionEmployeeResult.sort_order,
                ReviewSessionEmployeeResult.id,
            )
        )
        rows = (await self.session.execute(stmt)).scalars().all()
        return [
            RseResultItem(id=r.id, text=r.text, sort_order=r.sort_order) for r in rows
        ]

    async def _detail_schema(self, record, rse_id: int) -> RSESchema:
        """The full detail schema: the record plus the row-backed lists that its
        relationships deliberately do NOT load (see the noload note on the model).
        Every path returning a populated RSESchema goes through here, so a new
        row-backed list is added in one place rather than at eight call sites."""
        return self._to_schema(
            record,
            await self._load_rse_dimensions(rse_id),
            await self._load_rse_results(rse_id),
            await self._load_rse_feedbacks(rse_id),
        )

    def _to_schema(
        self,
        record,
        dimensions: list[RseDimensionItem] | None = None,
        results: list[RseResultItem] | None = None,
        feedbacks: list[RseFeedbackItem] | None = None,
    ) -> RSESchema:
        # The row-backed lists are passed in PRE-LOADED because this method is
        # SYNCHRONOUS and both relationships are noload — it must never query.
        # Callers use _detail_schema, which fetches them first.
        schema = RSESchema.model_validate(record)
        schema.dimensions = dimensions or []
        schema.results = results or []
        schema.feedbacks = feedbacks or []
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

    def _to_list_schema(
        self, record, facts_counts: dict[int, int] | None = None
    ) -> RSEListSchema:
        schema = RSEListSchema.model_validate(record)
        if record.employee:
            schema.employee_name = record.employee.name
            schema.employee_code = record.employee.code
        evals = getattr(record, "evaluations", []) or []
        schema.scored_count = sum(
            1 for e in evals if e.score is not None and e.score > 0
        )
        # Facts are rows now (employee_facts + the link table), not a text column
        # on the evaluation, so this count cannot be read off the loaded rows. It
        # is passed in PRE-AGGREGATED by _facts_counts — one grouped query for the
        # whole roster; a per-row relationship here would reintroduce the
        # documented people-review N+1. Granularity is unchanged: the number of
        # COMPETENCES carrying at least one fact, which the frontend divides by
        # total_dimensions to draw the progress bar.
        schema.facts_count = (facts_counts or {}).get(record.id, 0)
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

    async def _active_role_fields(
        self, process_role_id: int
    ) -> _ActiveRoleFields | None:
        """(link_target, key) of a ProcessRole via a COLUMN-ONLY query.

        Deliberately NOT ProcessRoleRepository.get_by_id: ProcessRole.holders is
        lazy="selectin", so get_by_id hydrates every holder -> their Employee ->
        Employee's whole selectin graph (~488 queries) just to read two scalar
        columns. This runs on every people-review request (visibility guard), so
        the difference is seconds per call. Returns None if the role is gone."""
        row = (
            await self.session.execute(
                select(ProcessRole.link_target, ProcessRole.key).where(
                    ProcessRole.id == process_role_id
                )
            )
        ).first()
        # Positional access matches the select order (link_target, key).
        return _ActiveRoleFields(row[0], row[1]) if row else None

    async def _facts_counts(self, rse_ids: list[int]) -> dict[int, int]:
        """Per review record: how many competences carry at least one FACT.
        ONE grouped query for the whole list (see _to_list_schema)."""
        return await EmployeeFactRepository(
            session=self.session
        ).count_evaluations_with_facts(rse_ids, FACT)

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

        role = await self._active_role_fields(ctx.process_role_id)
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

    async def get_active_role(self) -> _ActiveRoleFields | None:
        """The current user's ACTIVE people-review role (link_target + key) or None.

        None == 'only myself' mode (no active context / no role). Used by the
        comment service to classify the viewer as oversight (link_target
        'employee') vs supervision (link_target 'department'). Returns the two
        scalar fields only — every consumer uses just .link_target / .key, so it
        loads column-only (see _active_role_fields) instead of the full model."""
        if not self.user:
            return None
        ctx = await ProcessRoleActiveContextRepository(
            session=self.session
        ).get_for_employee(self.user.id)
        if ctx is None or ctx.process_role_id is None:
            return None
        return await self._active_role_fields(ctx.process_role_id)

    async def assert_rse_visible(self, rse_id: int) -> None:
        """Visibility guard for RSE sub-resources (evaluations, proposed level):
        if the record EXISTS but its employee is outside the caller's people-review
        scope, raise NotFound (404, not 403) so we don't leak that it exists. A
        missing rse_id is left for the caller to handle (returns empty/None), since
        there is nothing to leak. Called by the evaluation / proposed-level services
        so a typed-in out-of-scope URL can't pull another employee's review data."""
        # Column-only employee_id: session.get(RSEModel) would selectin-load the
        # reviewed employee's whole graph (~112 queries) just to read one column,
        # and this guard runs on every evaluations / level / comment sub-resource
        # request. A missing id returns (nothing to leak), same as before.
        employee_id = await self.session.scalar(
            select(RSEModel.employee_id).where(RSEModel.id == rse_id)
        )
        if employee_id is None:
            return
        visible = await self._visible_employee_ids()
        if employee_id not in visible:
            raise await self._resolve_domain_error(
                ReviewSessionEmployeeNotFound(rse_id)
            )

    async def assert_employee_visible(self, employee_id: int) -> None:
        """Visibility guard for EMPLOYEE-scoped people-review sub-resources (the
        employee's facts). Same resolver as assert_rse_visible, but keyed on the
        employee directly, because a fact can exist with no review record at all.
        Raises NotFound (404, not 403) so an out-of-scope id is not confirmed."""
        visible = await self._visible_employee_ids()
        if employee_id not in visible:
            raise await self._resolve_domain_error(
                ReviewSessionEmployeeNotFound(employee_id)
            )

    async def get_rse_detail_by_session_employee(
        self, session_id: int, employee_id: int
    ) -> RSESchema:
        """Resolve a single review record by (session, employee) for the nested
        /people_review/{session_id}/employee/{employee_id} route. Gated by the same
        visibility resolver as get_rse_detail: a non-existent record AND an
        out-of-scope employee both raise NotFound (no existence leak)."""
        # Column-only guard: resolve id + employee_id WITHOUT loading the RSE entity.
        # A select(RSEModel) here would selectin the reviewed employee's whole graph
        # up front — the double-hydration (this guard + the detail loader) that kept
        # the endpoint slow. Then load the detail once, cascade-free, below.
        row = (
            await self.session.execute(
                select(RSEModel.id, RSEModel.employee_id).where(
                    RSEModel.session_id == session_id,
                    RSEModel.employee_id == employee_id,
                )
            )
        ).first()
        visible = await self._visible_employee_ids()
        if row is None or row.employee_id not in visible:
            raise await self._resolve_domain_error(
                ReviewSessionEmployeeNotFound(row.id if row else employee_id)
            )
        # Detail loader RAISELOADS the reviewed employee's deep graph (trainings,
        # role links, events, person, job link-tables …) that _to_schema never reads
        # — keeps employee columns + job.name + main department.name + light
        # evaluations + session, so the detail resolves in a handful of queries.
        record = await self.repository.get_detail_by_id(row.id)
        return await self._detail_schema(record, row.id)

    async def get_session_employees(
        self,
        session_id: int,
        status: str | None = None,
        sort: str | None = None,
    ) -> list[RSEListSchema]:
        # Constrained roster load: employee name/code + light evaluations only,
        # not each of the 33 employees' full selectin graph (see list_by_session).
        # The final ordering is applied below from the roster order map, so `sort`
        # (a legacy DB-order hint) no longer affects the output.
        records = await self.repository.list_by_session(session_id, status)
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
        facts_counts = await self._facts_counts([r.id for r in records])
        result = [
            self._to_list_schema(r, facts_counts)
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

        # Only HUMAN employees can join a review (robots/system accounts out).
        from backend.api_v1.employee_origin.employee_origin_model import (
            HUMAN_ORIGIN_ID,
        )

        if employee.origin_id != HUMAN_ORIGIN_ID:
            raise await self._resolve_domain_error(
                ReviewSessionEmployeeNotHuman(employee.name)
            )

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

        rse = RSEModel(
            session_id=session_id,
            employee_id=employee_id,
            review_session_employee_status_id=await self._status_id(RSE_OPEN),
        )
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
        self, session_id: int, ordered_ids: list[int]
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

    async def _tempo_photo_enabled(self, surface: str = "individual") -> bool:
        """Effective photo flag for a TEMPO artifact: the individual-album child
        for single sheets (pdf/png/html), the session-deck child for the HTML
        presentation, the pptx child for the PowerPoint deck. Each is AND-ed with
        the master by get_effective_bool_setting, so the master switch (and a
        per-surface off) both hide the photo."""
        from backend.api_v1.app_setting.app_setting_service import (
            get_effective_bool_setting,
        )
        from backend.api_v1.employee_photo.employee_photo_service import (
            PHOTOS_PRESENTATION_INDIVIDUAL_KEY,
            PHOTOS_PRESENTATION_PPTX_KEY,
            PHOTOS_PRESENTATION_SESSION_KEY,
        )

        key = {
            "individual": PHOTOS_PRESENTATION_INDIVIDUAL_KEY,
            "session": PHOTOS_PRESENTATION_SESSION_KEY,
            "pptx": PHOTOS_PRESENTATION_PPTX_KEY,
        }[surface]
        return await get_effective_bool_setting(self.session, key, default=True)

    async def build_tempo_pdf(self, rse_id: int) -> bytes:
        """TEMPO album as PDF bytes (download artifact)."""
        from backend.api_v1.review_session_employee.tempo_pdf import build_tempo_pdf

        photo_enabled = await self._tempo_photo_enabled("individual")
        return build_tempo_pdf(await self._tempo_data(rse_id, photo_enabled))

    async def build_tempo_png(self, rse_id: int) -> bytes:
        """TEMPO album as PNG bytes (inline viewer — renders in any browser)."""
        from backend.api_v1.review_session_employee.tempo_pdf import render_tempo_png

        photo_enabled = await self._tempo_photo_enabled("individual")
        return render_tempo_png(await self._tempo_data(rse_id, photo_enabled))

    async def build_tempo_html(self, rse_id: int) -> str:
        """TEMPO album as a self-contained HTML page (one employee)."""
        from backend.api_v1.review_session_employee.tempo_html import render_tempo_html

        photo_enabled = await self._tempo_photo_enabled("individual")
        return render_tempo_html(await self._tempo_data(rse_id, photo_enabled))

    async def build_tempo_presentation(self, session_id: int) -> str:
        """Presentation HTML: every employee the current user can see in the
        session, in the user's roster order, with ◀ ▶ navigation. Reuses the
        ordered list the session screen shows."""
        from backend.api_v1.review_session_employee.tempo_html import (
            render_tempo_presentation,
        )

        # Resolve the session-deck photo flag ONCE for the whole deck (not per row).
        photo_enabled = await self._tempo_photo_enabled("session")
        ordered = await self.get_session_employees(session_id=session_id)
        sheets = [await self._tempo_data(rse.id, photo_enabled) for rse in ordered]
        return render_tempo_presentation(sheets)

    async def build_tempo_pptx(self, session_id: int) -> bytes:
        """TEMPO session deck as PowerPoint bytes (download artifact): a
        session-statistics title slide, then every employee the current user can
        see (roster order) on one slide — two when a new level is proposed (the
        requirements+facts get their own slide). Same data as the HTML deck."""
        from backend.api_v1.review_session.review_session_model import ReviewSession
        from backend.api_v1.review_session_department.review_session_department_model import (
            ReviewSessionDepartment,
        )
        from backend.api_v1.review_session_employee.tempo_pptx import build_tempo_pptx

        photo_enabled = await self._tempo_photo_enabled("pptx")
        ordered = await self.get_session_employees(session_id=session_id)
        sheets = [await self._tempo_data(rse.id, photo_enabled) for rse in ordered]

        session_row = await self.session.get(ReviewSession, session_id)
        period = None
        if session_row and (session_row.period_start or session_row.period_end):
            fmt = lambda d: d.strftime("%d.%m.%Y") if d else "…"  # noqa: E731
            period = f"{fmt(session_row.period_start)} — {fmt(session_row.period_end)}"
        dept_links = (
            await self.session.scalars(
                select(ReviewSessionDepartment).where(
                    ReviewSessionDepartment.session_id == session_id
                )
            )
        ).all()
        departments = (
            ", ".join(l.department.name for l in dept_links if l.department) or None
        )

        session_info = {
            "session_name": session_row.name if session_row else "—",
            "qty": len(sheets),
            "period": period,
            "departments": departments,
            "labels": {
                slot: await self._translate(key, fallback=key)
                for slot, key in (
                    ("employees", "tempoStatsEmployees"),
                    ("period", "tempoStatsPeriod"),
                    ("departments", "tempoStatsDepartments"),
                )
            },
        }
        return build_tempo_pptx(session_info, sheets)

    async def _tempo_training_lines(self, employee_id: int | None) -> list[str]:
        """The employee's assigned trainings as '• name — status' lines for the
        TEMPO training section (all artifacts: PDF/HTML/presentation/PPTX).
        Empty while the training-module master switch is OFF — the free-text
        required-trainings notes are appended by the caller regardless, since
        they survive the module being disabled."""
        from backend.api_v1.app_setting.app_setting_service import (
            TRAINING_MODULE_ENABLED_KEY,
            get_bool_setting,
        )

        if employee_id is None:
            return []
        if not await get_bool_setting(
            self.session, TRAINING_MODULE_ENABLED_KEY, default=True
        ):
            return []
        from backend.api_v1.employee_training.employee_training_model import (
            EmployeeTraining,
        )

        rows = (
            await self.session.scalars(
                select(EmployeeTraining)
                .where(EmployeeTraining.employee_id == employee_id)
                .order_by(EmployeeTraining.id)
            )
        ).all()
        lines: list[str] = []
        for r in rows:
            name = r.training_type.name if r.training_type else "—"
            status = r.training_status
            label = None
            if status:
                # Same key convention as the frontend (trainingStatusInProcess).
                label = await self._translate(
                    f"trainingStatus{self._pascal_dim_key(status.key)}",
                    fallback=status.key.replace("_", " "),
                )
            lines.append(f"• {name} — {label}" if label else f"• {name}")
        return lines

    async def _tempo_recommended_training_lines(
        self, employee_id: int | None
    ) -> list[str]:
        """The employee's ACTIVE recommended trainings as '• text — status' lines.

        Deliberately NOT gated on the training-module switch: these rows are the
        replacement for the old free-text notes on the review, and they survive
        the module being disabled — that independence is the whole reason they
        are their own essence with their own status lookup.

        Inactive rows are skipped: marking one inactive is how a stale
        recommendation is retired without deleting the record.
        """
        if employee_id is None:
            return []
        from backend.api_v1.employee_recommended_training.employee_recommended_training_model import (
            EmployeeRecommendedTraining,
        )

        rows = (
            await self.session.scalars(
                select(EmployeeRecommendedTraining)
                .where(
                    EmployeeRecommendedTraining.employee_id == employee_id,
                    EmployeeRecommendedTraining.is_active.is_(True),
                )
                .order_by(
                    EmployeeRecommendedTraining.sort_order,
                    EmployeeRecommendedTraining.id,
                )
            )
        ).all()

        lines: list[str] = []
        for r in rows:
            text_value = (r.description or "").strip()
            if not text_value:
                continue
            label = None
            if r.status:
                # Same key convention as everywhere else
                # (recommendedTrainingStatusInProcess).
                label = await self._translate(
                    f"recommendedTrainingStatus{self._pascal_dim_key(r.status.key)}",
                    fallback=r.status.key.replace("_", " "),
                )
            lines.append(f"• {text_value} — {label}" if label else f"• {text_value}")
        return lines

    async def _tempo_data(self, rse_id: int, photo_enabled: bool = True) -> dict:
        """Gather this review's data into the flat dict the TEMPO album builder
        expects. Visibility-gated like the detail page (out-of-scope -> NotFound).
        Missing data is left as a placeholder in the album by design — the user
        fills gaps after seeing the first draft. ``photo_enabled`` (resolved once
        by the caller from the matching per-surface child flag) decides whether the
        photo blob is read at all."""
        from datetime import date as _date

        from backend.api_v1.employee_child.employee_child_model import EmployeeChild
        from backend.api_v1.employee_education.employee_education_model import (
            EmployeeEducation,
        )

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
                select(EmployeeChild).where(EmployeeChild.person_id == emp.person_id)
            )
        ).all()
        children = None
        if children_rows:
            ages = sorted((today.year - c.birth_date.year) for c in children_rows)
            # Compact age suffix ("р." / "y.") resolved to the viewer's language.
            years_suffix = await self._translate("yearsShort", fallback="y.")
            children = ", ".join(f"{a} {years_suffix}" for a in ages)

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

        # Foreign languages: "English B2, French A1" from the person's profile.
        from backend.api_v1.employee_language_profile.employee_language_profile_model import (
            EmployeeLanguageProfile,
        )

        lang_profile = await self.session.scalar(
            select(EmployeeLanguageProfile).where(
                EmployeeLanguageProfile.person_id == emp.person_id
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

        # Per-user display gates (dev settings, user-overridable): hide the whole
        # proposal block — identity field, requirements slide/section — when the
        # proposed level is the BASIC (lowest active) level, or when it merely
        # confirms the current one ("same"). One gate each; both default ON.
        # Applies to every TEMPO artifact fed by this dict (PDF/HTML/PPTX).
        if registration:
            from backend.api_v1.app_setting.app_setting_service import (
                get_user_bool_setting,
            )

            user_id = self.user.id if self.user else None
            hide = level_sense == "same" and not await get_user_bool_setting(
                self.session,
                "tempo_show_proposed_level_same",
                user_id,
                default=True,
            )
            if not hide:
                base_level_id = await self.session.scalar(
                    select(ReviewLevel.id)
                    .where(ReviewLevel.is_active.is_(True))
                    .order_by(ReviewLevel.sort_order)
                    .limit(1)
                )
                hide = (
                    registration.level_id == base_level_id
                    and not await get_user_bool_setting(
                        self.session,
                        "tempo_show_proposed_level_basic",
                        user_id,
                        default=True,
                    )
                )
            if hide:
                registration = None
                proposed_level = None
                proposed_status = None
                level_requirements = []
                level_sense = None
                proposed_level_sense = None

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
        # below stay as-is for the PDF).
        #
        # Reads the `review_session_employee_dimensions` rows (it used to parse the
        # competence_summary JSON blob). The returned dict shape is deliberately
        # UNCHANGED ({name, color, comments}), which is why tempo_html / tempo_pdf
        # / tempo_pptx needed no edit — the same seam the missions refactor used.
        # `dim_meta` still wins for a competence evaluated in THIS review, so the
        # album's summary heading matches its bar chart; a competence outside the
        # review falls back to the row's own resolved name/colour.
        summary_rows = await self._load_rse_dimensions(record.id)
        result_rows = await self._load_rse_results(record.id)
        feedback_by_key = {
            f.review_session_employee_feedback_type_key: f.text
            for f in await self._load_rse_feedbacks(record.id)
        }

        def _summary_items(type_key: str) -> list[dict]:
            out = []
            for item in summary_rows:
                if item.review_session_employee_dimension_type_key != type_key:
                    continue
                name, color = dim_meta.get(
                    item.dimension_key, (item.dimension_name, item.dimension_color)
                )
                out.append(
                    {
                        "name": name,
                        "color": color,
                        "comments": [c for c in item.comments if c.strip()],
                    }
                )
            return out

        strengths_items = _summary_items(STRONG)
        development_items = _summary_items(DEVELOP)

        # Training section body: assigned trainings (gated by the training-module
        # master switch) above the employee's RECOMMENDED trainings.
        #
        # The recommendations are employee-scoped now, so — exactly like the
        # development missions — re-exporting an album for an OLD session shows
        # the employee's CURRENT list, not a snapshot of what was recommended
        # back then. Only ACTIVE ones render: an inactive row is one the employee
        # or their manager marked as no longer relevant.
        training_lines = await self._tempo_training_lines(emp_id)
        recommended_lines = await self._tempo_recommended_training_lines(emp_id)
        training_done = (
            "\n\n".join(
                p
                for p in ("\n".join(training_lines), "\n".join(recommended_lines))
                if p
            )
            or None
        )

        # All section/field labels resolved here so the renderer stays pure (no DB)
        # and nothing in the album is hardcoded.
        label_keys = {
            "competence_level": "competenceLevel",
            "results": "resultsAchievements",
            "not_achieved": "notAchieved",
            "strengths": "strongCompetences",
            "development": "competencesToDevelop",
            "idp": "developmentPlan",
            "kpi": "missionKpi",
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
            "photo_placeholder": "tempoPhotoPlaceholder",
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
            "results_achievements": self._rse_results_text(result_rows),
            "not_achieved": None,
            # Dict keys unchanged (tempo_html / tempo_pdf / tempo_pptx read them),
            # but the values now come from the feedback ROWS instead of two
            # columns — the same seam every other move in this refactor used.
            "employee_feedback": feedback_by_key.get(FEEDBACK_EMPLOYEE),
            "manager_feedback": feedback_by_key.get(FEEDBACK_MANAGER),
            "training_done": training_done,
            "idp_missions": await self._development_missions(
                record.employee_id, dim_meta
            ),
            "strengths": self._rse_dimensions_text(summary_rows, STRONG),
            "development_directions": self._rse_dimensions_text(summary_rows, DEVELOP),
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

    async def _development_missions(
        self,
        employee_id: int,
        dim_meta: dict[str, tuple[str, str]],
    ) -> list[dict]:
        """The employee's development missions, newest first, for the TEMPO album.

        Reads the employee-scoped `employee_missions` tables. It used to parse a
        JSON blob off `review_session_employees.development_plan`; the plan now
        belongs to the EMPLOYEE, which has one visible consequence worth knowing:
        re-exporting an album for an OLD session shows the employee's CURRENT
        missions, not a snapshot of what the plan looked like during that session.

        The returned dict shape is deliberately UNCHANGED
        ({text, kpi, dimension_key, name, color}) so `tempo_html`, `tempo_pdf`
        (`_idp_block`) and `tempo_pptx` keep working untouched — that contract is
        the clean seam of this refactor. `kpi` joins the mission's KPI texts,
        since the album has one line for it while a mission may now carry several.
        `dim_meta` is still keyed by dimension KEY, so the linked competence keeps
        resolving to the same name/colour the page uses.
        """
        from backend.api_v1.employee_mission.employee_mission_model import (
            EmployeeMission,
        )

        stmt = (
            select(EmployeeMission)
            .where(EmployeeMission.employee_id == employee_id)
            .order_by(EmployeeMission.start_date.desc(), EmployeeMission.id.desc())
        )
        missions = (await self.session.execute(stmt)).scalars().all()

        out: list[dict] = []
        for mission in missions:
            text = (mission.text or "").strip()
            if not text:
                continue
            link = mission.dimension_link
            key = link.dimension.key if link and link.dimension else None
            name, color = (None, None)
            if key:
                name, color = dim_meta.get(str(key), (None, None))
                # dim_meta only covers the dimensions evaluated in this review; a
                # mission may target another one, so fall back to the row itself.
                if name is None and link.dimension is not None:
                    name, color = link.dimension.name, link.dimension.color
            out.append(
                {
                    "text": text,
                    "kpi": "; ".join(k.text.strip() for k in mission.kpis if k.text),
                    "dimension_key": str(key) if key else None,
                    "name": name,
                    "color": color,
                }
            )
        return out

    @staticmethod
    def _rse_results_text(rows: list[RseResultItem]) -> str | None:
        """The results list as the numbered text the album has always rendered.

        Output shape is unchanged from when this was a stored column (a numbered
        line per result, or None when empty), so tempo_html / tempo_pdf /
        tempo_pptx need no edit — the numbering is just derived from position now
        instead of being stored inside the text.
        """
        lines = [f"{i + 1}. {r.text}" for i, r in enumerate(rows) if r.text.strip()]
        return "\n".join(lines) if lines else None

    @staticmethod
    def _rse_dimensions_text(
        summary_rows: list[RseDimensionItem], type_key: str
    ) -> str | None:
        """Flatten one side of the summary to the bulleted text the PDF renders.

        Output shape is unchanged from when this parsed the JSON blob ("• line"
        per comment, or None when the side is empty), so tempo_pdf needs no edit.
        """
        lines = [
            f"• {c}"
            for item in summary_rows
            if item.review_session_employee_dimension_type_key == type_key
            for c in item.comments
            if c.strip()
        ]
        return "\n".join(lines) if lines else None

    async def get_my_reviews(
        self,
        employee_id: int,
    ) -> list[RSEListSchema]:
        filters = {"employee_id": employee_id}
        records = await self.get_all(params=filters)
        facts_counts = await self._facts_counts([r.id for r in records])
        return [
            self._to_list_schema(r, facts_counts)
            for r in records
            if r.session and r.session.status == "open" and r.status == "open"
        ]

    async def get_my_latest_open(self) -> RSEListSchema | None:
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
        return self._to_list_schema(record, await self._facts_counts([record.id]))

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
        return await self._detail_schema(record, rse_id)

    async def update_fields(
        self, rse_id: int, payload: ReviewSessionEmployeeFieldsUpdate
    ) -> RSESchema:
        record = await self.get_by_id(rse_id)
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(record, field, value)
        await self.session.commit()
        await self.session.refresh(record)
        return await self._detail_schema(record, rse_id)

    async def _assert_rse_writable(self, rse_id: int):
        """Resolve a review record for WRITING, or raise.

        Two separate checks, both needed on every row-backed write endpoint —
        neither has an `{employee_id}` in its path for a route guard to scope on:

        - visibility: an out-of-scope record must not be writable by walking
          sequential ids, and it raises NotFound (not 403) so the reply does not
          confirm the record exists;
        - editability: a reviewed/closed record, or one in a closed session, is
          frozen. Same message the evaluation write path raises, since this is
          the same editable surface to the user.
        """
        record = await self.get_by_id(rse_id)
        visible = await self._visible_employee_ids()
        if record.employee_id not in visible:
            raise await self._resolve_domain_error(
                ReviewSessionEmployeeNotFound(rse_id)
            )
        if record.status != "open" or (
            record.session and record.session.status != "open"
        ):
            raise await self._resolve_domain_error(EvaluationNotEditable())
        return record

    async def set_rse_dimensions(
        self, rse_id: int, payload: RseDimensionsUpdate
    ) -> RSESchema:
        """Replace this review's competence summary with the payload's desired state.

        Delete-then-insert in ONE transaction rather than a reconciling upsert:
        nothing keys on these row ids (the frontend keys on the dimension) and,
        unlike missions, the summary has no audit trail — so there is no consumer
        for row identity. The frontend only calls this when the summary itself is
        dirty, so an unrelated edit never touches these rows. Revisit this if a
        summary history is ever added.

        `sort_order` is each item's index WITHIN ITS TYPE, from the payload order.
        """
        record = await self._assert_rse_writable(rse_id)

        known_type_ids = {
            t
            for (t,) in await self.session.execute(
                select(ReviewSessionEmployeeDimensionType.id)
            )
        }
        known_dim_ids = {
            d for (d,) in await self.session.execute(select(ReviewDimension.id))
        }
        for item in payload.items:
            if item.review_session_employee_dimension_type_id not in known_type_ids:
                raise await self._resolve_domain_error(
                    ReviewSessionEmployeeDimensionTypeNotFound(
                        item.review_session_employee_dimension_type_id
                    )
                )
            if item.dimension_id not in known_dim_ids:
                raise await self._resolve_domain_error(
                    ReviewDimensionNotFound(item.dimension_id)
                )

        try:
            existing = (
                (
                    await self.session.execute(
                        select(ReviewSessionEmployeeDimension).where(
                            ReviewSessionEmployeeDimension.review_session_employee_id
                            == rse_id
                        )
                    )
                )
                .scalars()
                .all()
            )
            for row in existing:
                await self.session.delete(row)
            # Flush the deletes before inserting, so replacing a competence that
            # is still in the payload cannot trip the (rse, type, dimension)
            # unique constraint.
            await self.session.flush()

            per_type_index: dict[int, int] = {}
            for item in payload.items:
                idx = per_type_index.get(
                    item.review_session_employee_dimension_type_id, 0
                )
                per_type_index[item.review_session_employee_dimension_type_id] = idx + 1
                row = ReviewSessionEmployeeDimension(
                    review_session_employee_id=rse_id,
                    review_session_employee_dimension_type_id=item.review_session_employee_dimension_type_id,
                    dimension_id=item.dimension_id,
                    sort_order=idx,
                )
                row.comments = [
                    ReviewSessionEmployeeDimensionComment(
                        text=text.strip(), sort_order=i
                    )
                    for i, text in enumerate(
                        c for c in item.comments if c and c.strip()
                    )
                ]
                self.session.add(row)

            await self.session.commit()
        except Exception:
            await self.session.rollback()
            raise

        return await self._detail_schema(record, rse_id)

    async def set_rse_results(
        self, rse_id: int, payload: RseResultsUpdate
    ) -> RSESchema:
        """Replace this review's results / achievements with the desired state.

        Delete-then-insert in one transaction, same reasoning as the dimensions:
        nothing keys on these row ids, there is no audit trail on them, and the
        frontend only calls this when the list itself is dirty. `sort_order` is
        the payload index, so it always matches the "1., 2., 3." the reader sees.

        Blank entries are dropped rather than stored — the old text column could
        not distinguish an empty line from a missing one.
        """
        record = await self._assert_rse_writable(rse_id)

        try:
            existing = (
                (
                    await self.session.execute(
                        select(ReviewSessionEmployeeResult).where(
                            ReviewSessionEmployeeResult.review_session_employee_id
                            == rse_id
                        )
                    )
                )
                .scalars()
                .all()
            )
            for row in existing:
                await self.session.delete(row)
            await self.session.flush()

            for idx, item in enumerate(
                i for i in payload.items if i.text and i.text.strip()
            ):
                self.session.add(
                    ReviewSessionEmployeeResult(
                        review_session_employee_id=rse_id,
                        text=item.text.strip(),
                        sort_order=idx,
                    )
                )

            await self.session.commit()
        except Exception:
            await self.session.rollback()
            raise

        return await self._detail_schema(record, rse_id)

    async def set_rse_feedbacks(
        self, rse_id: int, payload: RseFeedbacksUpdate
    ) -> RSESchema:
        """Replace this review's feedback with the payload's desired state.

        Upsert per voice rather than delete-then-insert: the pair
        (review, feedback type) is UNIQUE, and a blank text DELETES that voice's
        row so an emptied box leaves no trace instead of an empty string.

        Note this endpoint does NOT decide who may write which voice — the whole
        record is already gated by `_assert_rse_writable`, and the per-voice
        editability (an employee writing their own box, a manager theirs) is a
        frontend affordance exactly as it was when these were two columns.
        """
        record = await self._assert_rse_writable(rse_id)

        known_type_ids = {
            t
            for (t,) in await self.session.execute(
                select(ReviewSessionEmployeeFeedbackType.id)
            )
        }
        for item in payload.items:
            if item.review_session_employee_feedback_type_id not in known_type_ids:
                raise await self._resolve_domain_error(
                    ReviewSessionEmployeeFeedbackTypeNotFound(
                        item.review_session_employee_feedback_type_id
                    )
                )

        try:
            existing = {
                r.review_session_employee_feedback_type_id: r
                for r in (
                    await self.session.execute(
                        select(ReviewSessionEmployeeFeedback).where(
                            ReviewSessionEmployeeFeedback.review_session_employee_id
                            == rse_id
                        )
                    )
                )
                .scalars()
                .all()
            }
            for item in payload.items:
                text_value = (item.text or "").strip()
                row = existing.get(item.review_session_employee_feedback_type_id)
                if not text_value:
                    if row is not None:
                        await self.session.delete(row)
                elif row is not None:
                    row.text = text_value
                else:
                    self.session.add(
                        ReviewSessionEmployeeFeedback(
                            review_session_employee_id=rse_id,
                            review_session_employee_feedback_type_id=(
                                item.review_session_employee_feedback_type_id
                            ),
                            text=text_value,
                        )
                    )
            await self.session.commit()
        except Exception:
            await self.session.rollback()
            raise

        return await self._detail_schema(record, rse_id)

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

        record.review_session_employee_status_id = await self._status_id(target_status)
        await self.session.commit()
        await self.session.refresh(record)

        schema = await self._detail_schema(record, rse_id)
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

        record.review_session_employee_status_id = await self._status_id(RSE_OPEN)
        await self.session.commit()
        await self.session.refresh(record)

        schema = await self._detail_schema(record, rse_id)
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

        record.review_session_employee_status_id = await self._status_id(target)
        await self.session.commit()
        await self.session.refresh(record)

        schema = await self._detail_schema(record, rse_id)
        emp_name = record.employee.name if record.employee else str(rse_id)
        detail = await self._resolve_domain_success(
            ReviewSessionEmployeeStatusChangeSuccess(
                emp_name, await self._status_label(target)
            )
        )
        return MutationResponse(detail=detail, data=schema)
