from typing import Optional, List

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee_events.employee_event_direction_type.employee_event_direction_type_repository import (
    EmployeeEventDirectionTypeRepository,
)
from backend.api_v1.employee_events.employee_event_direction_type.employee_event_direction_type_schema import (
    EmployeeEventDirectionType as EmployeeEventDirectionTypeSchema,
    EmployeeEventDirectionTypeCreate,
    EmployeeEventDirectionTypeUpdate,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_events.employee_event_direction_type.employee_event_direction_type_messages import (
    EmployeeEventDirectionTypeNotFound,
    EmployeeEventDirectionTypeNotFoundByCode,
    EmployeeEventDirectionTypeCodeTaken,
    EmployeeEventDirectionTypeDeleteError,
)
from backend.api_v1.employee_events.employee_event_direction_type.employee_event_direction_type_messages import (
    EmployeeEventDirectionTypeDeleteSuccess,
    EmployeeEventDirectionTypeCreateSuccess,
    EmployeeEventDirectionTypeUpdateSuccess,
)


class EmployeeEventDirectionTypeService(BaseService):
    def __init__(
        self,
        repository: EmployeeEventDirectionTypeRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int) -> EmployeeEventDirectionTypeSchema:
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(
                EmployeeEventDirectionTypeNotFound(id)
            )
        return result

    async def get_employee_event_direction_types(
        self,
        code: Optional[str] = None,
        sort: Optional[str] = None,
    ) -> List[EmployeeEventDirectionTypeSchema]:
        if code:
            record = await self.get_by_field("code", code)
            if not record:
                raise await self._resolve_domain_error(
                    EmployeeEventDirectionTypeNotFoundByCode(code)
                )
            return [EmployeeEventDirectionTypeSchema.model_validate(record)]
        records = await self.get_all(sort_json=sort)
        return [EmployeeEventDirectionTypeSchema.model_validate(r) for r in records]

    async def create_employee_event_direction_type(
        self, type_in: EmployeeEventDirectionTypeCreate
    ) -> MutationResponse[EmployeeEventDirectionTypeSchema]:
        if await self.get_by_field("code", type_in.code):
            raise await self._resolve_domain_error(
                EmployeeEventDirectionTypeCodeTaken(type_in.code)
            )
        try:
            record = await self.create(type_in)
            schema = EmployeeEventDirectionTypeSchema.model_validate(record)
            detail = await self._resolve_domain_success(
                EmployeeEventDirectionTypeCreateSuccess(schema.code)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                EmployeeEventDirectionTypeCodeTaken(type_in.code)
            )

    async def update_employee_event_direction_type(
        self, type_id: int, type_update: EmployeeEventDirectionTypeUpdate
    ) -> MutationResponse[EmployeeEventDirectionTypeSchema]:
        try:
            orm_record = await self.get_by_id(type_id)
            updated = await self.update(orm_record, type_update, partial=True)
            schema = EmployeeEventDirectionTypeSchema.model_validate(updated)
            detail = await self._resolve_domain_success(
                EmployeeEventDirectionTypeUpdateSuccess(schema.code)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                EmployeeEventDirectionTypeCodeTaken(orm_record.code)
            )

    async def delete_employee_event_direction_type(self, type_id: int) -> None:
        record = await self.get_by_id(type_id)
        await self.delete_by_id(
            type_id,
            name=record.code,
            delete_error_exc=EmployeeEventDirectionTypeDeleteError,
            delete_success_exc=EmployeeEventDirectionTypeDeleteSuccess,
        )
