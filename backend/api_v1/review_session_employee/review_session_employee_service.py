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
        if record.employee:
            schema.employee_name = record.employee.name
            schema.employee_code = record.employee.code
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
        schema.scored_count = sum(1 for e in evals if e.score is not None and e.score > 0)
        schema.facts_count = sum(1 for e in evals if e.facts and e.facts.strip())
        schema.total_dimensions = len(evals)
        # queue_position is filled by get_session_employees from the reviewer's
        # roster order (the shared order_position store), not from the RSE row.
        return schema

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
                repository=ProcessRoleHolderDepartmentLinkRepository(session=self.session),
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
                repository=ProcessRoleHolderEmployeeLinkRepository(session=self.session),
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
        stmt = (
            select(RSEModel)
            .join(ReviewSession, ReviewSession.id == RSEModel.session_id)
            .where(
                RSEModel.employee_id == self.user.id,
                ReviewSession.status == "open",
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

    async def change_status(
        self, rse_id: int, target_status: str
    ) -> MutationResponse[RSESchema]:
        record = await self.get_by_id(rse_id)
        valid = RSE_VALID_TRANSITIONS.get(record.status, [])
        if target_status not in valid:
            exc = ReviewSessionEmployeeStatusError(record.status, target_status)
            raise await self._resolve_domain_error(exc)

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
