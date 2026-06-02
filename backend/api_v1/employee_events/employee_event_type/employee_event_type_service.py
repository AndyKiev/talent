from typing import Optional, List

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee_events.employee_event_type.employee_event_type_repository import (
    EmployeeEventTypeRepository,
)
from backend.api_v1.employee_events.employee_event_type.employee_event_type_schema import (
    EmployeeEventType as EmployeeEventTypeSchema,
    EmployeeEventTypeCreate,
    EmployeeEventTypeUpdate,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_events.employee_event_type.employee_event_type_errors import (
    EmployeeEventTypeNotFound,
    EmployeeEventTypeNotFoundByName,
    EmployeeEventTypeNotFoundByCode,
    EmployeeEventTypeNameTaken,
    EmployeeEventTypeCodeTaken,
    EmployeeEventTypeDeleteError,
)
from backend.api_v1.employee_events.employee_event_type.employee_event_type_success import (
    EmployeeEventTypeDeleteSuccess,
    EmployeeEventTypeCreateSuccess,
    EmployeeEventTypeUpdateSuccess,
)


class EmployeeEventTypeService(BaseService):
    def __init__(
        self,
        repository: EmployeeEventTypeRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int) -> EmployeeEventTypeSchema:
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(EmployeeEventTypeNotFound(id))
        return result

    async def get_employee_event_types(
        self,
        name: Optional[str] = None,
        sort: Optional[str] = None,
    ) -> List[EmployeeEventTypeSchema]:
        if name:
            record = await self.get_by_name(
                name, not_found_exc=EmployeeEventTypeNotFoundByName
            )
            return [EmployeeEventTypeSchema.model_validate(record)]
        records = await self.get_all(sort_json=sort)
        return [EmployeeEventTypeSchema.model_validate(r) for r in records]

    async def create_employee_event_type(
        self, type_in: EmployeeEventTypeCreate
    ) -> MutationResponse[EmployeeEventTypeSchema]:
        await self.exists_by_name(
            type_in.name, already_exists_exc=EmployeeEventTypeNameTaken
        )
        await self.exists_by_field_excluding(
            field_name="code",
            value=type_in.code,
            exclude_ids=[],
            already_exists_exc=EmployeeEventTypeCodeTaken,
        )
        try:
            record = await self.create(type_in)
            schema = EmployeeEventTypeSchema.model_validate(record)
            detail = await self._resolve_domain_success(
                EmployeeEventTypeCreateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                EmployeeEventTypeNameTaken(type_in.name)
            )

    async def update_employee_event_type(
        self, type_id: int, type_update: EmployeeEventTypeUpdate
    ) -> MutationResponse[EmployeeEventTypeSchema]:
        if type_update.name:
            await self.exists_by_name_excluding(
                type_update.name,
                exclude_ids=[type_id],
                already_exists_exc=EmployeeEventTypeNameTaken,
            )
        if type_update.code:
            await self.exists_by_field_excluding(
                field_name="code",
                value=type_update.code,
                exclude_ids=[type_id],
                already_exists_exc=EmployeeEventTypeCodeTaken,
            )
        try:
            orm_record = await self.get_by_id(type_id)
            updated = await self.update(orm_record, type_update, partial=True)
            schema = EmployeeEventTypeSchema.model_validate(updated)
            detail = await self._resolve_domain_success(
                EmployeeEventTypeUpdateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                EmployeeEventTypeNameTaken(type_update.name)
            )

    async def delete_employee_event_type(self, type_id: int) -> None:
        record = await self.get_by_id(type_id)
        await self.delete_by_id(
            type_id,
            name=record.name,
            delete_error_exc=EmployeeEventTypeDeleteError,
            delete_success_exc=EmployeeEventTypeDeleteSuccess,
        )
