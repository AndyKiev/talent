from typing import List

from sqlalchemy import select, delete, distinct

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.employee.employee_model import Employee
from backend.api_v1.user_group.user_group_errors import (
    UserGroupNotFound,
    UserGroupsNotFound,
)
from backend.api_v1.user_group.user_group_model import UserGroup
from backend.api_v1.table_relationship_links.employee_user_group_link_model import (
    EmployeeUserGroupLink,
)
from backend.api_v1.table_relationship_links.job_user_group_link_model import (
    JobUserGroupLink,
)
from backend.api_v1.table_relationship_links.employee_current_level_model import (
    EmployeeCurrentLevel,
)
from backend.api_v1.table_relationship_links.employee_personal_data_model import (
    EmployeePersonalData,
)
from backend.api_v1.operation.operation_model import Operation
from backend.api_v1.table_relationship_links.operation_user_group_link_model import (
    OperationUserGroupLink,
)
from backend.api_v1.employee.employee_errors import (
    EmployeeNotFound,
    EmployeeAlreadyInGroup,
    UserNotInGroup,
)


class EmployeeRepository(BaseRepository):
    model = Employee

    # -----------------------------------------------------------------------
    # Custom multi-join query — no base equivalent
    # -----------------------------------------------------------------------

    async def get_user_operations(self, user_id: int) -> List[str]:
        """Return unique operation names accessible to a employee via their groups."""
        stmt = (
            select(distinct(Operation.name))
            .select_from(EmployeeUserGroupLink)
            .join(UserGroup, EmployeeUserGroupLink.user_group_id == UserGroup.id)
            .join(
                OperationUserGroupLink,
                UserGroup.id == OperationUserGroupLink.user_group_id,
            )
            .join(Operation, OperationUserGroupLink.operation_id == Operation.id)
            .where(EmployeeUserGroupLink.employee_id == user_id)
            .order_by(Operation.name)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_code(self, code: str) -> Employee | None:
        """Case-normalised lookup by employee code."""
        return await self.get_by_field("code", code.strip().upper())

    # -----------------------------------------------------------------------
    # Group management — typed domain errors instead of ValueError
    # -----------------------------------------------------------------------

    async def _get_user_and_group(
        self, user_id: int, group_id: int
    ) -> tuple[Employee, UserGroup]:
        user = await self.get_by_id(user_id)
        if not user:
            raise EmployeeNotFound(user_id)

        group = (
            await self.session.execute(
                select(UserGroup).where(UserGroup.id == group_id)
            )
        ).scalar_one_or_none()
        if not group:
            raise UserGroupNotFound(group_id)

        return user, group

    async def _get_association(
        self, user_id: int, group_id: int
    ) -> EmployeeUserGroupLink | None:
        return (
            await self.session.execute(
                select(EmployeeUserGroupLink).where(
                    EmployeeUserGroupLink.employee_id == user_id,
                    EmployeeUserGroupLink.user_group_id == group_id,
                )
            )
        ).scalar_one_or_none()

    async def add_to_group(self, user_id: int, user_group_id: int) -> Employee:
        user, group = await self._get_user_and_group(user_id, user_group_id)
        if await self._get_association(user_id, user_group_id):
            raise EmployeeAlreadyInGroup(user.code, group.name)

        self.session.add(
            EmployeeUserGroupLink(user_id=user_id, user_group_id=user_group_id)
        )
        await self.session.commit()
        return await self.get_by_id(user_id)

    # -----------------------------------------------------------------------
    # Current career level — 1:1 link table (people-review)
    # -----------------------------------------------------------------------

    async def set_current_level(self, user_id: int, level_id: int) -> Employee:
        """Upsert the employee's current level in the 1:1 link table.

        Re-fetches via get_by_id so the returned Employee carries the freshly
        loaded current_level_link (selectin) — the in-memory one is stale.
        """
        user = await self.get_by_id(user_id)
        if not user:
            raise EmployeeNotFound(user_id)

        existing = (
            await self.session.execute(
                select(EmployeeCurrentLevel).where(
                    EmployeeCurrentLevel.employee_id == user_id
                )
            )
        ).scalar_one_or_none()
        if existing:
            existing.level_id = level_id
        else:
            self.session.add(
                EmployeeCurrentLevel(employee_id=user_id, level_id=level_id)
            )
        await self.session.commit()
        # expire_on_commit is False, so the in-memory user still holds the stale
        # (pre-insert) relationship — expire it so get_by_id reloads it.
        self.session.expire(user, ["current_level_link"])
        return await self.get_by_id(user_id)

    # -----------------------------------------------------------------------
    # Personal data — 1:1 link table (birth date, etc.)
    # -----------------------------------------------------------------------

    async def set_personal_data(self, user_id: int, fields: dict) -> Employee:
        """Upsert the employee's personal data in the 1:1 table.

        `fields` is a partial dict (e.g. {"birth_date": ...} or {"hire_date": ...});
        only the keys present are applied, so setting one date never clears another.
        Re-fetches via get_by_id so the returned Employee carries the freshly
        loaded personal_data (selectin) — the in-memory one is stale.
        """
        user = await self.get_by_id(user_id)
        if not user:
            raise EmployeeNotFound(user_id)

        existing = (
            await self.session.execute(
                select(EmployeePersonalData).where(
                    EmployeePersonalData.employee_id == user_id
                )
            )
        ).scalar_one_or_none()
        if existing:
            for key, value in fields.items():
                setattr(existing, key, value)
        else:
            self.session.add(EmployeePersonalData(employee_id=user_id, **fields))
        await self.session.commit()
        # expire_on_commit is False, so the in-memory user still holds the stale
        # (pre-insert) relationship — expire it so get_by_id reloads it.
        self.session.expire(user, ["personal_data"])
        return await self.get_by_id(user_id)

    async def remove_from_group(self, user_id: int, user_group_id: int) -> Employee:
        user, group = await self._get_user_and_group(user_id, user_group_id)
        association = await self._get_association(user_id, user_group_id)
        if not association:
            raise UserNotInGroup(user.code, group.name)

        await self.session.delete(association)
        await self.session.commit()
        return await self.get_by_id(user_id)

    async def set_groups(self, user_id: int, user_group_ids: List[int]) -> Employee:
        if not await self.get_by_id(user_id):
            raise EmployeeNotFound(user_id)

        existing_groups = (
            (
                await self.session.execute(
                    select(UserGroup).where(UserGroup.id.in_(user_group_ids))
                )
            )
            .scalars()
            .all()
        )

        if len(existing_groups) != len(user_group_ids):
            missing = set(user_group_ids) - {g.id for g in existing_groups}
            raise UserGroupsNotFound(missing)

        await self.session.execute(
            delete(EmployeeUserGroupLink).where(
                EmployeeUserGroupLink.employee_id == user_id
            )
        )
        self.session.add_all(
            [
                EmployeeUserGroupLink(user_id=user_id, user_group_id=gid)
                for gid in user_group_ids
            ]
        )
        await self.session.commit()
        return await self.get_by_id(user_id)

    # -----------------------------------------------------------------------
    # Job-group sync
    # -----------------------------------------------------------------------

    async def sync_groups_from_job(self, user_id: int) -> tuple[Employee, int, int]:
        """
        Full two-way sync: make a employee's group memberships exactly match the
        groups linked to their job.

        - Adds table_relationship_links that are on the job but missing from the employee.
        - Removes table_relationship_links that are on the employee but no longer on the job.

        Returns:
            (updated_user, added_count, removed_count)
        """
        user = await self.get_by_id(user_id)
        if not user:
            raise EmployeeNotFound(user_id)

        # Groups currently attached to the employee
        current_group_ids: set[int] = {link.user_group_id for link in user.user_groups}

        # Groups attached to the employee's job (source of truth)
        job_group_ids_result = await self.session.execute(
            select(JobUserGroupLink.user_group_id).where(
                JobUserGroupLink.job_id == user.job_id
            )
        )
        job_group_ids: set[int] = set(job_group_ids_result.scalars().all())

        to_add = job_group_ids - current_group_ids
        to_remove = current_group_ids - job_group_ids

        if to_remove:
            await self.session.execute(
                delete(EmployeeUserGroupLink).where(
                    EmployeeUserGroupLink.employee_id == user_id,
                    EmployeeUserGroupLink.user_group_id.in_(to_remove),
                )
            )

        if to_add:
            self.session.add_all(
                [
                    EmployeeUserGroupLink(user_id=user_id, user_group_id=gid)
                    for gid in to_add
                ]
            )

        if to_add or to_remove:
            await self.session.commit()

        updated_user = await self.get_by_id(user_id)
        return updated_user, len(to_add), len(to_remove)

    async def get_employee_ids_by_job(self, job_id: int) -> List[int]:
        """Return IDs of all users assigned to a given job."""
        result = await self.session.execute(
            select(Employee.id).where(Employee.job_id == job_id)
        )
        return list(result.scalars().all())
