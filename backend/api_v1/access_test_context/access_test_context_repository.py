from collections.abc import Sequence

from sqlalchemy import delete, select

from backend.api_v1.access_test_context.access_test_context_model import (
    AccessTestContext,
)
from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.user_group.user_group_model import UserGroup
from backend.api_v1.user_group_type.user_group_type_model import UserGroupType


class AccessTestContextRepository(BaseRepository):
    model = AccessTestContext

    async def get_for_employee(self, employee_id: int) -> AccessTestContext | None:
        stmt = select(self.model).where(self.model.employee_id == employee_id)
        return await self.session.scalar(stmt)

    async def get_authorisation_groups(self) -> Sequence[UserGroup]:
        """Selectable groups: authorisation-type, excluding bypass groups
        (impersonating a bypass group would be pointless — bypass is forced off
        during testing, leaving only that group's explicit grants)."""
        stmt = (
            select(UserGroup)
            .join(UserGroupType, UserGroup.user_group_type_id == UserGroupType.id)
            .where(
                UserGroupType.is_authorisation.is_(True),
                UserGroup.is_bypass.is_(False),
            )
            .order_by(UserGroup.name)
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def get_groups_by_ids(self, group_ids: list[int]) -> Sequence[UserGroup]:
        if not group_ids:
            return []
        stmt = select(UserGroup).where(UserGroup.id.in_(group_ids))
        result = await self.session.scalars(stmt)
        return result.all()

    async def upsert(self, employee_id: int, group_ids: list[int]) -> AccessTestContext:
        record = await self.get_for_employee(employee_id)
        if record is None:
            record = AccessTestContext(employee_id=employee_id, group_ids=group_ids)
            self.session.add(record)
        else:
            record.group_ids = group_ids
        await self.session.commit()
        await self.session.refresh(record)
        return record

    async def delete_for_employee(self, employee_id: int) -> None:
        await self.session.execute(
            delete(self.model).where(self.model.employee_id == employee_id)
        )
        await self.session.commit()
