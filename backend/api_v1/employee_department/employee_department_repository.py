from collections.abc import Sequence

from sqlalchemy import select

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.employee_department.employee_department_model import (
    EmployeeDepartment,
)


class EmployeeDepartmentRepository(BaseRepository):

    model = EmployeeDepartment

    # ── Lookup helpers ─────────────────────────────────────────────────────────

    async def get_by_employee(self, employee_id: int) -> Sequence[EmployeeDepartment]:
        """Return the employee's main-department rows (0 or 1)."""
        stmt = (
            select(self.model)
            .where(self.model.employee_id == employee_id)
            .order_by(self.model.id)
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def get_main_by_employee(self, employee_id: int) -> EmployeeDepartment | None:
        """Return the employee's main assignment, if any (at most one —
        enforced by the unique constraint on employee_id)."""
        stmt = select(self.model).where(self.model.employee_id == employee_id)
        result = await self.session.scalars(stmt)
        return result.one_or_none()

    async def get_main_employee_ids_in_departments(
        self, department_ids: set[int] | list[int]
    ) -> set[int]:
        """Employee ids whose MAIN department is one of `department_ids`.
        Used by people-review supervision scoping (department subtree)."""
        if not department_ids:
            return set()
        stmt = select(self.model.employee_id).where(
            self.model.department_id.in_(list(department_ids)),
        )
        result = await self.session.scalars(stmt)
        return set(result.all())
