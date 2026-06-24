from __future__ import annotations

from datetime import date
from typing import List, Sequence

from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.hrm_scope.hrm_scope_model import HrmScope
from backend.api_v1.department.department_model import Department
from backend.api_v1.employee.employee_model import Employee
from backend.api_v1.table_relationship_links.employee_user_group_link_model import (
    EmployeeUserGroupLink,
)
from backend.api_v1.user_group.user_group_model import UserGroup


class HrmScopeRepository(BaseRepository):
    model = HrmScope

    async def get_by_id_with_rels(self, scope_id: int) -> HrmScope | None:
        stmt = (
            select(HrmScope)
            .where(HrmScope.id == scope_id)
            .options(
                selectinload(HrmScope.employee),
                selectinload(HrmScope.department).selectinload(
                    Department.department_category
                ),
            )
        )
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def get_by_employee(self, employee_id: int) -> Sequence[HrmScope]:
        """All scope rows for one HRM, with department + its category preloaded."""
        stmt = (
            select(HrmScope)
            .where(HrmScope.employee_id == employee_id)
            .options(
                selectinload(HrmScope.department).selectinload(
                    Department.department_category
                ),
            )
            .order_by(HrmScope.start_date.desc())
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def get_hrm_employees(self, hrm_group_name: str) -> List[Employee]:
        """
        Employees who hold the HRM authorisation group, with job + scopes
        preloaded for the grid counts.
        """
        stmt = (
            select(Employee)
            .join(Employee.user_groups)
            .join(EmployeeUserGroupLink.user_group)
            .where(UserGroup.name == hrm_group_name)
            .options(
                selectinload(Employee.job),
            )
            .order_by(Employee.code)
            .distinct()
        )
        result = await self.session.scalars(stmt)
        return list(result.all())

    async def count_by_employee(self, employee_id: int) -> int:
        stmt = select(func.count(HrmScope.id)).where(
            HrmScope.employee_id == employee_id
        )
        return int((await self.session.execute(stmt)).scalar() or 0)

    async def get_active_scope_department_ids(
        self, employee_id: int, on_date: date
    ) -> set[int]:
        """
        Department IDs of this HRM's scopes that are ACTIVE on ``on_date``
        (start_date <= on_date <= end_date, both ends inclusive).

        These are the scope roots; the service expands them to subtrees
        (ancestor-or-self) before filtering employees.
        """
        stmt = select(HrmScope.department_id).where(
            HrmScope.employee_id == employee_id,
            HrmScope.start_date <= on_date,
            HrmScope.end_date >= on_date,
        )
        result = await self.session.scalars(stmt)
        return set(result.all())

    async def get_active_scope_department_ids(
        self, employee_id: int, on_date
    ) -> set[int]:
        """
        Department IDs this HRM is actively scoped to on `on_date`
        (start_date <= on_date <= end_date). These are the scope roots; the
        service expands them to ancestor-or-self subtrees for visibility.
        """
        stmt = select(HrmScope.department_id).where(
            HrmScope.employee_id == employee_id,
            HrmScope.start_date <= on_date,
            HrmScope.end_date >= on_date,
        )
        result = await self.session.scalars(stmt)
        return set(result.all())
