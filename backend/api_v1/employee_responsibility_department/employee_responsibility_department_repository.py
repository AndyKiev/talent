from typing import Sequence

from sqlalchemy import select, delete

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.employee_responsibility_department.employee_responsibility_department_model import (
    EmployeeResponsibilityDepartment,
)


class EmployeeResponsibilityDepartmentRepository(BaseRepository):

    model = EmployeeResponsibilityDepartment

    # ── Lookup helpers ─────────────────────────────────────────────────────────

    async def get_by_employee(
        self, employee_id: int
    ) -> Sequence[EmployeeResponsibilityDepartment]:
        """Return all responsibility assignments for a given employee."""
        stmt = (
            select(self.model)
            .where(self.model.employee_id == employee_id)
            .order_by(self.model.id)
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def get_by_double(
        self,
        employee_id: int,
        department_id: int,
    ) -> EmployeeResponsibilityDepartment | None:
        """Lookup by the unique (employee, department) pair."""
        stmt = select(self.model).where(
            self.model.employee_id == employee_id,
            self.model.department_id == department_id,
        )
        result = await self.session.scalars(stmt)
        return result.one_or_none()

    async def delete_all_by_employee(self, employee_id: int) -> None:
        """Remove every responsibility link of an employee (REPLACE semantics
        on event apply / transfer). Does NOT commit — the caller commits."""
        await self.session.execute(
            delete(self.model).where(self.model.employee_id == employee_id)
        )
