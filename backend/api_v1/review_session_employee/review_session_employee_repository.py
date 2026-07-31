from sqlalchemy import select
from sqlalchemy.orm import joinedload, raiseload, selectinload

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.employee.employee_model import Employee
from backend.api_v1.employee_department.employee_department_model import (
    EmployeeDepartment,
)
from backend.api_v1.review_session.review_session_model import ReviewSession
from backend.api_v1.review_session_employee.review_session_employee_model import (
    ReviewSessionEmployee,
)


class ReviewSessionEmployeeRepository(BaseRepository):
    model = ReviewSessionEmployee

    async def get_detail_by_id(self, rse_id: int):
        """Load one RSE for the detail view WITHOUT the reviewed employee's deep
        selectin cascade (~112 queries). _to_schema needs only: the RSE's own
        columns + the light evaluations list, the session name/status, and the
        employee's personal columns + job.name + main department.name. Everything
        else — the employee's trainings/role-links/events, the job's link
        tables, the session's roster — is raiseloaded, so the detail resolves in a
        handful of queries. Nothing in the detail path reads those raiseloaded
        relationships; if that changes, widen the explicit loaders below.

        `person` is NOT in the raiseloaded set: it stopped being optional when
        employees.name was dropped, because the display name and the personal
        facts are now all composed from it."""
        stmt = (
            select(self.model)
            .where(self.model.id == rse_id)
            .options(
                # Session: load its status_rel (the .status property reads it) but
                # raiseload everything else — ReviewSession.review_session_employees
                # would re-enter the whole employee graph. Light evaluations: rows
                # only (Evaluation.review_session_employee re-enters it too).
                selectinload(self.model.session).options(
                    joinedload(ReviewSession.status_rel).raiseload("*"),
                    raiseload("*"),
                ),
                selectinload(self.model.evaluations).raiseload("*"),
                selectinload(self.model.employee).options(
                    joinedload(Employee.job).raiseload("*"),
                    selectinload(Employee.departments)
                    .joinedload(EmployeeDepartment.department)
                    .raiseload("*"),
                    # person is REQUIRED, not optional: Employee.name composes
                    # from it, and .birth_date / .sex / .marital_status are all
                    # properties that proxy it. One extra batched query.
                    selectinload(Employee.person).raiseload("*"),
                    raiseload("*"),
                ),
            )
        )
        return await self.session.scalar(stmt)

    async def list_by_session(self, session_id: int, status: str | None = None):
        """Roster load: RSE rows for a session with the reviewed employee's
        code + person (for the composed name) + the light evaluations
        (score/facts) ONLY. Raiseloads
        the employee's deep graph, the evaluations' relationships, and the session
        — none of which _to_list_schema reads — so a 33-row roster doesn't hydrate
        33 employees' whole graphs (~1300 queries). The service re-sorts by roster
        order, so no DB order_by is needed here."""
        stmt = select(self.model).where(self.model.session_id == session_id)
        if status:
            stmt = stmt.where(self.model.status == status)
        stmt = stmt.options(
            selectinload(self.model.employee).options(
                # Employee.name has no column behind it any more — it composes
                # the person's parts — so the roster needs person loaded or the
                # display name raises. selectin batches it into ONE query for
                # the whole roster, not one per row.
                selectinload(Employee.person).raiseload("*"),
                raiseload("*"),
            ),
            selectinload(self.model.evaluations).raiseload("*"),
            raiseload(self.model.session),
        )
        result = await self.session.scalars(stmt)
        return result.all()
