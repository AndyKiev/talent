# backend/api_v1/employee_user_group_link/employee_user_group_link_repository.py
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.table_relationship_links.employee_user_group_link_model import (
    EmployeeUserGroupLink,
)
from backend.api_v1.employee.employee_model import Employee
from backend.api_v1.user_group.user_group_model import UserGroup


class EmployeeUserGroupLinkRepository(BaseRepository):
    model = EmployeeUserGroupLink

    async def get_by_composite_key(
        self, employee_id: int, user_group_id: int
    ) -> Optional[EmployeeUserGroupLink]:
        """Fetch a single link by its unique (employee_id, user_group_id) pair."""
        return (
            await self.session.execute(
                select(EmployeeUserGroupLink).where(
                    EmployeeUserGroupLink.employee_id == employee_id,
                    EmployeeUserGroupLink.user_group_id == user_group_id,
                )
            )
        ).scalar_one_or_none()

    async def get_by_employee(
        self, employee_id: int
    ) -> List[EmployeeUserGroupLink]:
        """All links for one employee, with the user_group (+ its type) eager-loaded."""
        stmt = (
            select(EmployeeUserGroupLink)
            .where(EmployeeUserGroupLink.employee_id == employee_id)
            .options(
                selectinload(EmployeeUserGroupLink.user_group).selectinload(
                    UserGroup.user_group_type
                )
            )
        )
        result = await self.session.scalars(stmt)
        return list(result.all())

    async def get_employees_with_groups(self) -> List[Employee]:
        """
        All employees with their group links (+ each group's type) eager-loaded.
        Powers the Users management grid.
        """
        stmt = (
            select(Employee)
            .options(
                selectinload(Employee.user_groups)
                .selectinload(EmployeeUserGroupLink.user_group)
                .selectinload(UserGroup.user_group_type),
                selectinload(Employee.job),
            )
            .order_by(Employee.code)
        )
        result = await self.session.scalars(stmt)
        return list(result.all())
