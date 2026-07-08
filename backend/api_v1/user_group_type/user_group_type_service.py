from typing import Optional, List

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.user_group_type.user_group_type_repository import (
    UserGroupTypeRepository,
)
from backend.api_v1.user_group_type.user_group_type_schema import (
    UserGroupType as UserGroupTypeSchema,
    UserGroupTypeCreate,
    UserGroupTypeUpdate,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.user_group_type.user_group_type_messages import (
    UserGroupTypeNotFound,
    UserGroupTypeNameTaken,
    UserGroupTypeDeleteError,
    UserGroupTypeNotFoundByName,
)
from backend.api_v1.user_group_type.user_group_type_messages import (
    UserGroupTypeDeleteSuccess,
    UserGroupTypeCreateSuccess,
    UserGroupTypeUpdateSuccess,
)


class UserGroupTypeService(BaseService):
    def __init__(
        self,
        repository: UserGroupTypeRepository,
        user: Optional[EmployeeSchema] = None,
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
    ) -> MutationResponse[UserGroupTypeSchema]:
        await self.exists_by_name(
            type_in.name, already_exists_exc=UserGroupTypeNameTaken
        )
        try:
            record = await self.create(type_in)
            schema = UserGroupTypeSchema.model_validate(record)
            detail = await self._resolve_domain_success(
                UserGroupTypeCreateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(UserGroupTypeNameTaken(type_in.name))

    async def update_user_group_type(
        self, type_id: int, type_update: UserGroupTypeUpdate
    ) -> MutationResponse[UserGroupTypeSchema]:
        if type_update.name:
            await self.exists_by_name(
                type_update.name, already_exists_exc=UserGroupTypeNameTaken
            )
        try:
            orm_record = await self.get_by_id(type_id)
            updated = await self.update(orm_record, type_update, partial=True)
            schema = UserGroupTypeSchema.model_validate(updated)
            detail = await self._resolve_domain_success(
                UserGroupTypeUpdateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                UserGroupTypeNameTaken(type_update.name)
            )

    async def delete_user_group_type(self, type_id: int) -> None:
        record = await self.get_by_id(type_id)
        await self.delete_by_id(
            type_id,
            name=record.name,
            delete_error_exc=UserGroupTypeDeleteError,
            delete_success_exc=UserGroupTypeDeleteSuccess,
        )
