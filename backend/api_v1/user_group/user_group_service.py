
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.user_group.user_group_messages import (
    UserGroupCreateSuccess,
    UserGroupDeleteError,
    UserGroupDeleteSuccess,
    UserGroupNameTaken,
    UserGroupNotFound,
    UserGroupUpdateSuccess,
)
from backend.api_v1.user_group.user_group_repository import UserGroupRepository
from backend.api_v1.user_group.user_group_schema import (
    UserGroup as UserGroupSchema,
)
from backend.api_v1.user_group.user_group_schema import (
    UserGroupCreate,
    UserGroupUpdate,
)


class UserGroupService(BaseService):
    def __init__(
        self,
        repository: UserGroupRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)
        self.current_user = user

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _user_group_to_schema(self, user_group) -> UserGroupSchema:
        """
        Convert ORM UserGroup → UserGroupSchema.

        Fields populated automatically via model_validate (from_attributes=True):
          - all mapped columns (name, description, is_protected, user_group_type_id, id)
          - oel_ids          — from UserGroup.oel_ids property (selectin-loaded)
          - user_group_type_name — from UserGroup.user_group_type_name property

        Fields enriched manually (require a separate DB query):
          - users_qty        — active/inactive employee counts
        """
        user_group_data = UserGroupSchema.model_validate(user_group)
        user_counts = await self.repository._get_user_counts_for_group(user_group.id)
        user_group_data.users_qty = user_counts
        return user_group_data

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    async def get_user_groups(
        self, user_group_type_id: int | None = None
    ) -> list[UserGroupSchema]:
        """
        Return all user groups with user counts.
        Protected groups are only visible to users who themselves belong
        to at least one protected group.
        """
        all_groups = await self.repository.get_all_user_groups()

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

    async def get_user_group_by_id(self, user_group_id: int) -> UserGroupSchema:
        """Get user group by ID with user counts."""
        user_group = await self.repository.get_user_group_by_id(user_group_id)
        if not user_group:
            raise UserGroupNotFound(group_id=user_group_id)
        return await self._user_group_to_schema(user_group)

    async def get_user_group_by_name(self, name: str) -> UserGroupSchema | None:
        """Get user group by name."""
        user_group = await self.repository.get_user_group_by_name(name)
        if user_group:
            return await self._user_group_to_schema(user_group)
        return None

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    async def create_user_group(
        self, user_group_in: UserGroupCreate
    ) -> MutationResponse[UserGroupSchema]:
        existing = await self.repository.get_user_group_by_name(user_group_in.name)
        if existing:
            raise await self._resolve_domain_error(
                UserGroupNameTaken(user_group_in.name)
            )

        user_group = self.repository.model(**user_group_in.model_dump())
        created = await self.repository.create(user_group)
        schema = await self._user_group_to_schema(created)
        detail = await self._resolve_domain_success(UserGroupCreateSuccess(schema.name))
        return MutationResponse(detail=detail, data=schema)

    async def update_user_group(
        self,
        user_group_id: int,
        user_group_update: UserGroupUpdate,
        partial: bool = False,
    ) -> MutationResponse[UserGroupSchema]:
        orm_group = await self.repository.get_user_group_by_id(user_group_id)
        if not orm_group:
            raise UserGroupNotFound(group_id=user_group_id)

        update_data = user_group_update.model_dump(exclude_unset=partial)
        updated = await self.repository.update(orm_group, update_data)
        schema = await self._user_group_to_schema(updated)
        detail = await self._resolve_domain_success(UserGroupUpdateSuccess(schema.name))
        return MutationResponse(detail=detail, data=schema)

    async def delete_user_group(self, user_group_id: int) -> None:
        user_group = await self.get_user_group_by_id(user_group_id)
        if not user_group:
            raise UserGroupNotFound(group_id=user_group_id)
        await self.delete_by_id(
            user_group_id,
            name=user_group.name,
            delete_error_exc=UserGroupDeleteError,
            delete_success_exc=UserGroupDeleteSuccess,
        )
