from typing import Optional, List

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee_status.employee_status_repository import (
    EmployeeStatusRepository,
)
from backend.api_v1.employee_status.employee_status_schema import (
    EmployeeStatus as EmployeeStatusSchema,
    EmployeeStatusCreate,
    EmployeeStatusUpdate,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_status.employee_status_messages import (
    EmployeeStatusNotFound,
    EmployeeStatusNameTaken,
    EmployeeStatusDeleteError,
    EmployeeStatusNotFoundByName,
)
from backend.api_v1.employee_status.employee_status_messages import (
    EmployeeStatusDeleteSuccess,
    EmployeeStatusCreateSuccess,
    EmployeeStatusUpdateSuccess,
)


class EmployeeStatusService(BaseService):
    def __init__(
        self,
        repository: EmployeeStatusRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int) -> EmployeeStatusSchema:
        result = await self.repository.get_by_id(id)
        if not result:
            exc = EmployeeStatusNotFound(id)
            raise await self._resolve_domain_error(exc)
        return result

    async def get_employee_statuses(
        self,
        name: Optional[str] = None,
        sort: Optional[str] = None,
    ) -> List[EmployeeStatusSchema]:
        if name:
            record = await self.get_by_name(
                name, not_found_exc=EmployeeStatusNotFoundByName
            )
            return [EmployeeStatusSchema.model_validate(record)]
        records = await self.get_all(sort_json=sort)
        return [EmployeeStatusSchema.model_validate(r) for r in records]

    async def create_employee_status(
        self, status_in: EmployeeStatusCreate
    ) -> MutationResponse[EmployeeStatusSchema]:
        await self.exists_by_name(
            status_in.name, already_exists_exc=EmployeeStatusNameTaken
        )
        try:
            record = await self.create(status_in)
            schema = EmployeeStatusSchema.model_validate(record)
            detail = await self._resolve_domain_success(
                EmployeeStatusCreateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                EmployeeStatusNameTaken(status_in.name)
            )

    async def update_employee_status(
        self, status_id: int, type_update: EmployeeStatusUpdate
    ) -> MutationResponse[EmployeeStatusSchema]:
        if type_update.name:
            await self.exists_by_name(
                type_update.name, already_exists_exc=EmployeeStatusNameTaken
            )
        try:
            orm_record = await self.get_by_id(status_id)
            updated = await self.update(orm_record, type_update, partial=True)
            schema = EmployeeStatusSchema.model_validate(updated)
            detail = await self._resolve_domain_success(
                EmployeeStatusUpdateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                EmployeeStatusNameTaken(type_update.name)
            )

    async def delete_employee_status(self, status_id: int) -> None:
        record = await self.get_by_id(status_id)
        await self.delete_by_id(
            status_id,
            name=record.name,
            delete_error_exc=EmployeeStatusDeleteError,
            delete_success_exc=EmployeeStatusDeleteSuccess,
        )
