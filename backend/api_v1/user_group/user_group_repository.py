from typing import Sequence, Optional, Dict
from sqlalchemy import select, func, case
from sqlalchemy.engine import Result

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.user_group.user_group_model import UserGroup
from backend.api_v1.base.models.links.user_user_group_link_model import (
    UserUserGroupLink,
)
from backend.api_v1.user.user_model import User


class UserGroupRepository(BaseRepository):
    model = UserGroup

    async def get_all_user_groups(self) -> Sequence[UserGroup]:
        """Get all user groups"""
        stmt = select(UserGroup).order_by(UserGroup.name)
        result: Result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_user_group_by_id(self, user_group_id: int) -> Optional[UserGroup]:
        """Get user group by ID"""
        stmt = select(UserGroup).where(UserGroup.id == user_group_id)
        result: Result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_user_group_by_name(self, name: str) -> Optional[UserGroup]:
        """Get user group by name"""
        stmt = select(UserGroup).where(UserGroup.name == name)
        result: Result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def _get_user_counts_for_group(self, user_group_id: int) -> Dict[str, int]:
        """Get active and inactive user counts for a user group - Oracle compatible"""
        stmt = (
            select(
                func.count(UserUserGroupLink.user_id).label("total_users"),
                func.sum(case((User.is_active == True, 1), else_=0)).label(
                    "active_users"
                ),
                func.sum(case((User.is_active == False, 1), else_=0)).label(
                    "inactive_users"
                ),
            )
            .select_from(UserUserGroupLink)
            .join(User, UserUserGroupLink.user_id == User.id)
            .where(UserUserGroupLink.user_group_id == user_group_id)
        )

        result: Result = await self.session.execute(stmt)
        counts = result.first()

        return {
            "active": counts.active_users or 0,
            "inactive": counts.inactive_users or 0,
        }
