from typing import Sequence

from sqlalchemy import select, func, and_

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.employee_department.employee_department_model import (
    EmployeeDepartment,
)


class EmployeeDepartmentRepository(BaseRepository):

    model = EmployeeDepartment

    # ── Lookup helpers ─────────────────────────────────────────────────────────

    async def get_by_employee(self, employee_id: int) -> Sequence[EmployeeDepartment]:
        """Return all assignment records for a given employee."""
        stmt = (
            select(self.model)
            .where(self.model.employee_id == employee_id)
            .order_by(self.model.id)
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def count_by_employee(self, employee_id: int) -> int:
        """Return the number of assignments for a given employee."""
        stmt = (
            select(func.count())
            .select_from(self.model)
            .where(self.model.employee_id == employee_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one()

    async def get_main_by_employee(self, employee_id: int) -> EmployeeDepartment | None:
        """Return the main assignment for a given employee, if any."""
        stmt = select(self.model).where(
            self.model.employee_id == employee_id,
            self.model.is_main == True,
        )
        result = await self.session.scalars(stmt)
        return result.one_or_none()

    async def count_main_by_employee(self, employee_id: int) -> int:
        """Return the number of main assignments for a given employee (0 or 1)."""
        stmt = (
            select(func.count())
            .select_from(self.model)
            .where(
                self.model.employee_id == employee_id,
                self.model.is_main == True,
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one()

    async def get_main_employee_ids_in_departments(
        self, department_ids: set[int] | list[int]
    ) -> set[int]:
        """Employee ids whose MAIN department is one of `department_ids`.
        Used by people-review supervision scoping (department subtree)."""
        if not department_ids:
            return set()
        stmt = select(self.model.employee_id).where(
            self.model.is_main == True,
            self.model.department_id.in_(list(department_ids)),
        )
        result = await self.session.scalars(stmt)
        return set(result.all())

    async def get_by_double(
        self,
        employee_id: int,
        department_id: int,
    ) -> EmployeeDepartment | None:
        """
        Lookup by the unique (employee, department) triple.
        Used to enforce uniqueness on create and update.
        """
        stmt = select(self.model).where(
            self.model.employee_id == employee_id,
            self.model.department_id == department_id,
        )
        result = await self.session.scalars(stmt)
        return result.one_or_none()

    async def get_by_id_and_employee(
        self,
        link_id: int,
        employee_id: int,
    ) -> EmployeeDepartment | None:
        """
        Fetch a single link scoped to its owner employee.
        Prevents cross-employee access by ID alone.
        """
        stmt = select(self.model).where(
            self.model.id == link_id,
            self.model.employee_id == employee_id,
        )
        result = await self.session.scalars(stmt)
        return result.one_or_none()
