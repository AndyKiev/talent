from typing import List, Optional
from backend.api_v1.base.base_service import BaseService
from backend.api_v1.user_group.user_group_repository import UserGroupRepository
from backend.api_v1.user_group.user_group_schema import (
    UserGroup as UserGroupSchema,
    UserGroupCreate,
    UserGroupUpdate,
)
from backend.api_v1.user.user_schema import User as UserSchema


class UserGroupService(BaseService):
    def __init__(
        self,
        repository: UserGroupRepository,
        current_user: Optional[UserSchema] = None,
    ):
        super().__init__(repository)
        self.current_user = current_user

    def _user_can_see_protected(self) -> bool:
        """
        Returns True if the requesting user belongs to at least one
        group that is flagged is_protected=True.
        We check this by looking at whether any of the user's group names
        match a protected group — but since we only have group names on the
        UserSchema, we rely on the fact that the repository already loaded
        the full ORM objects with is_protected. The simplest approach:
        the caller passes the full ORM list and we check there.
        We use the pre-fetched all_groups list inside get_user_groups.
        """
        return False  # default — overridden inside get_user_groups

    async def _user_group_to_schema(self, user_group) -> UserGroupSchema:
        """Convert ORM UserGroup object to UserGroupSchema with user counts"""
        user_group_data = UserGroupSchema.model_validate(user_group)
        user_counts = await self.repository._get_user_counts_for_group(user_group.id)
        user_group_data.users_qty = user_counts
        return user_group_data

    async def get_user_groups(
        self, user_group_type_id: Optional[int] = None
    ) -> List[UserGroupSchema]:
        """
        Get all user groups with user counts.
        Protected groups (is_protected=True) are only returned if the
        requesting user is themselves a member of at least one protected group.
        """
        all_groups = await self.repository.get_all_user_groups()

        # Determine whether the current user can see protected groups:
        # build a set of protected group names from the full ORM list,
        # then check intersection with the user's own group names.
        user_group_names: set[str] = (
            set(self.current_user.groups) if self.current_user else set()
        )
        protected_names: set[str] = {g.name for g in all_groups if g.is_protected}
        can_see_protected: bool = bool(user_group_names & protected_names)

        result = []
        for group in all_groups:
            if group.is_protected and not can_see_protected:
                continue
            if (
                user_group_type_id is not None
                and group.user_group_type_id != user_group_type_id
            ):
                continue
            result.append(await self._user_group_to_schema(group))

        return result

    async def get_user_group_by_id(
        self, user_group_id: int
    ) -> Optional[UserGroupSchema]:
        """Get user group by ID with user counts"""
        user_group = await self.repository.get_user_group_by_id(user_group_id)
        if user_group:
            return await self._user_group_to_schema(user_group)
        return None

    async def get_user_group_by_name(self, name: str) -> Optional[UserGroupSchema]:
        """Get user group by name"""
        user_group = await self.repository.get_user_group_by_name(name)
        if user_group:
            return await self._user_group_to_schema(user_group)
        return None

    async def create_user_group(
        self, user_group_in: UserGroupCreate
    ) -> UserGroupSchema:
        """Create a new user group"""
        existing_user_group = await self.repository.get_user_group_by_name(
            user_group_in.name
        )
        if existing_user_group:
            raise ValueError(
                f"User group with name '{user_group_in.name}' already exists"
            )

        user_group = self.repository.model(**user_group_in.model_dump())
        created = await self.repository.create(user_group)
        return await self._user_group_to_schema(created)

    async def update_user_group(
        self,
        user_group_id: int,
        user_group_update: UserGroupUpdate,
        partial: bool = False,
    ) -> UserGroupSchema:
        """Update a user group"""
        user_group = await self.repository.get_user_group_by_id(user_group_id)
        if not user_group:
            raise ValueError(f"User group {user_group_id} not found")

        update_data = user_group_update.model_dump(exclude_unset=partial)
        updated = await self.repository.update(user_group, update_data)
        return await self._user_group_to_schema(updated)

    async def delete_user_group(self, user_group_id: int) -> None:
        """Delete a user group"""
        user_group = await self.repository.get_user_group_by_id(user_group_id)
        if not user_group:
            raise ValueError(f"User group {user_group_id} not found")
        await self.repository.delete(user_group)
