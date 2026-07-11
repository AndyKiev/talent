from sqlalchemy import select
from sqlalchemy.orm import selectinload, joinedload, raiseload

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.review_session_employee.review_session_employee_model import (
    ReviewSessionEmployee,
)
from backend.api_v1.employee.employee_model import Employee
from backend.api_v1.employee_department.employee_department_model import (
    EmployeeDepartment,
)
from backend.api_v1.review_session.review_session_model import ReviewSession


class ReviewSessionEmployeeRepository(BaseRepository):
    model = ReviewSessionEmployee

    async def get_detail_by_id(self, rse_id: int):
        """Load one RSE for the detail view WITHOUT the reviewed employee's deep
        selectin cascade (~112 queries). _to_schema needs only: the RSE's own
        columns + the light evaluations list, the session name/status, and the
        employee's personal columns + job.name + main department.name. Everything
        else — the employee's trainings/role-links/events/person, the job's link
        tables, the session's roster — is raiseloaded, so the detail resolves in a
        handful of queries. Nothing in the detail path reads those raiseloaded
        relationships; if that changes, widen the explicit loaders below."""
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
                    raiseload("*"),
                ),
            )
        )
        return await self.session.scalar(stmt)

    async def list_by_session(self, session_id: int, status: str | None = None):
        """Roster load: RSE rows for a session with the reviewed employee's
        name/code columns + the light evaluations (score/facts) ONLY. Raiseloads
        the employee's deep graph, the evaluations' relationships, and the session
        — none of which _to_list_schema reads — so a 33-row roster doesn't hydrate
        33 employees' whole graphs (~1300 queries). The service re-sorts by roster
        order, so no DB order_by is needed here."""
        stmt = select(self.model).where(self.model.session_id == session_id)
        if status:
            stmt = stmt.where(self.model.status == status)
        stmt = stmt.options(
            selectinload(self.model.employee).raiseload("*"),
            selectinload(self.model.evaluations).raiseload("*"),
            raiseload(self.model.session),
        )
        result = await self.session.scalars(stmt)
        return result.all()
