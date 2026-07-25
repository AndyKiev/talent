
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.setting_value_type.setting_value_type_messages import (
    SettingValueTypeCreateSuccess,
    SettingValueTypeDeleteError,
    SettingValueTypeDeleteSuccess,
    SettingValueTypeKeyTaken,
    SettingValueTypeNotFound,
    SettingValueTypeUpdateSuccess,
)
from backend.api_v1.setting_value_type.setting_value_type_repository import (
    SettingValueTypeRepository,
)
from backend.api_v1.setting_value_type.setting_value_type_schema import (
    SettingValueType as SettingValueTypeSchema,
)
from backend.api_v1.setting_value_type.setting_value_type_schema import (
    SettingValueTypeCreate,
    SettingValueTypeUpdate,
)


class SettingValueTypeService(BaseService):
    def __init__(
        self,
        repository: SettingValueTypeRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int) -> SettingValueTypeSchema:
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(SettingValueTypeNotFound(id))
        return result

    async def get_setting_value_types(
        self, sort: str | None = None
    ) -> list[SettingValueTypeSchema]:
        records = await self.get_all(sort_json=sort)
        return [SettingValueTypeSchema.model_validate(r) for r in records]

    async def create_setting_value_type(
        self, type_in: SettingValueTypeCreate
    ) -> MutationResponse[SettingValueTypeSchema]:
        existing = await self.repository.get_by_field("key", type_in.key)
        if existing:
            raise await self._resolve_domain_error(
                SettingValueTypeKeyTaken(type_in.key)
            )
        try:
            record = await self.create(type_in)
            schema = SettingValueTypeSchema.model_validate(record)
            detail = await self._resolve_domain_success(
                SettingValueTypeCreateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                SettingValueTypeKeyTaken(type_in.key)
            )

    async def update_setting_value_type(
        self, type_id: int, type_update: SettingValueTypeUpdate
    ) -> MutationResponse[SettingValueTypeSchema]:
        orm_record = await self.get_by_id(type_id)
        updated = await self.update(orm_record, type_update, partial=True)
        schema = SettingValueTypeSchema.model_validate(updated)
        detail = await self._resolve_domain_success(
            SettingValueTypeUpdateSuccess(schema.name)
        )
        return MutationResponse(detail=detail, data=schema)

    async def delete_setting_value_type(self, type_id: int) -> None:
        record = await self.get_by_id(type_id)
        await self.delete_by_id(
            type_id,
            name=record.name,
            delete_error_exc=SettingValueTypeDeleteError,
            delete_success_exc=SettingValueTypeDeleteSuccess,
        )
