from typing import Optional, List

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.user_group_type.user_group_type_repository import (
    UserGroupTypeRepository,
)
from backend.api_v1.user_group_type.user_group_type_schema import (
    UserGroupType as UserGroupTypeSchema,
    UserGroupTypeCreate,
    UserGroupTypeUpdate,
)
from backend.api_v1.user.user_schema import User as UserSchema
from backend.api_v1.user_group_type.user_group_type_errors import (
    UserGroupTypeNotFound,
    UserGroupTypeNameTaken,
    UserGroupTypeDeleteError,
    UserGroupTypeNotFoundByName,
    UserGroupTypeDeleteSuccess,
)

# from backend.domain.errors import DomainError


class UserGroupTypeService(BaseService):
    def __init__(
        self,
        repository: UserGroupTypeRepository,
        user: Optional[UserSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int) -> UserGroupTypeSchema:
        result = await self.repository.get_by_id(id)
        if not result:
            exc = UserGroupTypeNotFound(id)
            raise await self._resolve_domain_error(exc)
        return result

    async def get_user_group_types(
        self,
        name: Optional[str] = None,
        sort: Optional[str] = None,
    ) -> List[UserGroupTypeSchema]:
        if name:
            record = await self.get_by_name(
                name, not_found_exc=UserGroupTypeNotFoundByName
            )
            return [UserGroupTypeSchema.model_validate(record)]
        records = await self.get_all(sort_json=sort)
        return [UserGroupTypeSchema.model_validate(r) for r in records]

    async def create_user_group_type(
        self, type_in: UserGroupTypeCreate
    ) -> UserGroupTypeSchema:
        await self.exists_by_name(
            type_in.name, already_exists_exc=UserGroupTypeNameTaken
        )
        try:
            record = await self.create(type_in)
            return UserGroupTypeSchema.model_validate(record)
        except IntegrityError:
            raise await self._resolve_domain_error(UserGroupTypeNameTaken(type_in.name))

    async def update_user_group_type(
        self, type_id: int, type_update: UserGroupTypeUpdate
    ) -> UserGroupTypeSchema:
        if type_update.name:
            await self.exists_by_name(
                type_update.name, already_exists_exc=UserGroupTypeNameTaken
            )
        try:
            orm_record = await self.get_by_id(type_id)
            updated = await self.update(orm_record, type_update, partial=True)
            return UserGroupTypeSchema.model_validate(updated)
        except IntegrityError:
            raise await self._resolve_domain_error(
                UserGroupTypeNameTaken(type_update.name)
            )

    async def delete_user_group_type(self, type_id: int) -> None:
        record = await self.get_by_id(
            type_id
        )  # raises UserGroupTypeNotFound if missing
        await self.delete_by_id(
            type_id,
            name=record.name,
            delete_error_exc=UserGroupTypeDeleteError,
            delete_success_exc=UserGroupTypeDeleteSuccess,
        )

    # async def create_user_group_type(
    #     self, type_in: UserGroupTypeCreate
    # ) -> UserGroupTypeSchema:
    #     if await self.repository.get_by_field("name", type_in.name):
    #         exc = UserGroupTypeNameTaken(type_in.name)
    #         raise await self._resolve_domain_error(exc)
    #     try:
    #         record = await self.create(type_in)
    #         return UserGroupTypeSchema.model_validate(record)
    #     except IntegrityError:
    #         exc = UserGroupTypeNameTaken(type_in.name)
    #         raise await self._resolve_domain_error(exc)
    #
    # async def update_user_group_type(
    #     self, type_id: int, type_update: UserGroupTypeUpdate
    # ) -> UserGroupTypeSchema:
    #     if type_update.name and await self.repository.get_by_field(
    #         "name", type_update.name
    #     ):
    #         exc = UserGroupTypeNameTaken(type_update.name)
    #         raise await self._resolve_domain_error(exc)
    #     try:
    #         orm_record = await self.get_by_id(type_id)
    #         updated = await self.update(orm_record, type_update, partial=True)
    #         return UserGroupTypeSchema.model_validate(updated)
    #     except IntegrityError:
    #         exc = UserGroupTypeNameTaken(type_update.name)
    #         raise await self._resolve_domain_error(exc)

    # async def delete_user_group_type(self, type_id: int) -> None:
    #     record = await self.get_by_id(
    #         type_id
    #     )  # raises UserGroupTypeNotFound if missing
    #     try:
    #         await self.delete_by_id(type_id)
    #     except IntegrityError:
    #         exc = UserGroupTypeDeleteError(record.name)
    #         raise await self._resolve_domain_error(exc)
    #
    #     await self._raise_success(
    #         message_key="userGroupTypeDeleteSuccess",
    #         variables={"name": record.name},
    #         fallback=f"User group type '{record.name}' successfully deleted",
    #     )
