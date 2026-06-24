from typing import Optional, List

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee_events.employee_event_change_dept_type.employee_event_change_dept_type_repository import (
    EmployeeEventChangeDeptTypeRepository,
)
from backend.api_v1.employee_events.employee_event_change_dept_type.employee_event_change_dept_type_schema import (
    EmployeeEventChangeDeptType as EmployeeEventChangeDeptTypeSchema,
    EmployeeEventChangeDeptTypeCreate,
    EmployeeEventChangeDeptTypeUpdate,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_events.employee_event_change_dept_type.employee_event_change_dept_type_errors import (
    EmployeeEventChangeDeptTypeNotFound,
    EmployeeEventChangeDeptTypeNotFoundByCode,
    EmployeeEventChangeDeptTypeCodeTaken,
    EmployeeEventChangeDeptTypeDeleteError,
)
from backend.api_v1.employee_events.employee_event_change_dept_type.employee_event_change_dept_type_success import (
    EmployeeEventChangeDeptTypeDeleteSuccess,
    EmployeeEventChangeDeptTypeCreateSuccess,
    EmployeeEventChangeDeptTypeUpdateSuccess,
)


class EmployeeEventChangeDeptTypeService(BaseService):
    def __init__(
        self,
        repository: EmployeeEventChangeDeptTypeRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int) -> EmployeeEventChangeDeptTypeSchema:
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(
                EmployeeEventChangeDeptTypeNotFound(id)
            )
        return result

    async def get_employee_event_change_dept_types(
        self,
        code: Optional[str] = None,
        sort: Optional[str] = None,
    ) -> List[EmployeeEventChangeDeptTypeSchema]:
        if code:
            record = await self.get_by_field(
                "code", code, not_found_exc=EmployeeEventChangeDeptTypeNotFoundByCode
            )
            return [EmployeeEventChangeDeptTypeSchema.model_validate(record)]
        records = await self.get_all(sort_json=sort)
        return [EmployeeEventChangeDeptTypeSchema.model_validate(r) for r in records]

    async def create_employee_event_change_dept_type(
        self, type_in: EmployeeEventChangeDeptTypeCreate
    ) -> MutationResponse[EmployeeEventChangeDeptTypeSchema]:
        await self.exists_by_field(
            "code",
            type_in.code,
            already_exists_exc=EmployeeEventChangeDeptTypeCodeTaken,
        )
        try:
            record = await self.create(type_in)
            schema = EmployeeEventChangeDeptTypeSchema.model_validate(record)
            detail = await self._resolve_domain_success(
                EmployeeEventChangeDeptTypeCreateSuccess(schema.code)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                EmployeeEventChangeDeptTypeCodeTaken(type_in.code)
            )

    async def update_employee_event_change_dept_type(
        self, type_id: int, type_update: EmployeeEventChangeDeptTypeUpdate
    ) -> MutationResponse[EmployeeEventChangeDeptTypeSchema]:
        try:
            orm_record = await self.get_by_id(type_id)
            updated = await self.update(orm_record, type_update, partial=True)
            schema = EmployeeEventChangeDeptTypeSchema.model_validate(updated)
            detail = await self._resolve_domain_success(
                EmployeeEventChangeDeptTypeUpdateSuccess(schema.code)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                EmployeeEventChangeDeptTypeCodeTaken(orm_record.code)
            )

    async def delete_employee_event_change_dept_type(self, type_id: int) -> None:
        record = await self.get_by_id(type_id)
        await self.delete_by_id(
            type_id,
            name=record.code,
            delete_error_exc=EmployeeEventChangeDeptTypeDeleteError,
            delete_success_exc=EmployeeEventChangeDeptTypeDeleteSuccess,
        )
