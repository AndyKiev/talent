from typing import Optional, List

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee_events.employee_event_status.employee_event_status_repository import (
    EmployeeEventStatusRepository,
)
from backend.api_v1.employee_events.employee_event_status.employee_event_status_schema import (
    EmployeeEventStatusSchema,
    EmployeeEventStatusCreate,
    EmployeeEventStatusUpdate,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_events.employee_event_status.employee_event_status_errors import (
    EmployeeEventStatusNotFound,
    EmployeeEventStatusNotFoundByName,
    EmployeeEventStatusNameTaken,
    EmployeeEventStatusDeleteError,
)
from backend.api_v1.employee_events.employee_event_status.employee_event_status_success import (
    EmployeeEventStatusDeleteSuccess,
    EmployeeEventStatusCreateSuccess,
    EmployeeEventStatusUpdateSuccess,
)


class EmployeeEventStatusService(BaseService):
    def __init__(
        self,
        repository: EmployeeEventStatusRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int) -> EmployeeEventStatusSchema:
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(EmployeeEventStatusNotFound(id))
        return result

    async def get_employee_event_statuses(
        self,
        name: Optional[str] = None,
        sort: Optional[str] = None,
    ) -> List[EmployeeEventStatusSchema]:
        if name:
            record = await self.get_by_name(
                name, not_found_exc=EmployeeEventStatusNotFoundByName
            )
            return [EmployeeEventStatusSchema.model_validate(record)]
        records = await self.get_all(sort_json=sort)
        return [EmployeeEventStatusSchema.model_validate(r) for r in records]

    async def create_employee_event_status(
        self, status_in: EmployeeEventStatusCreate
    ) -> MutationResponse[EmployeeEventStatusSchema]:
        await self.exists_by_name(
            status_in.name, already_exists_exc=EmployeeEventStatusNameTaken
        )
        try:
            record = await self.create(status_in)
            schema = EmployeeEventStatusSchema.model_validate(record)
            detail = await self._resolve_domain_success(
                EmployeeEventStatusCreateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                EmployeeEventStatusNameTaken(status_in.name)
            )

    async def update_employee_event_status(
        self, status_id: int, status_update: EmployeeEventStatusUpdate
    ) -> MutationResponse[EmployeeEventStatusSchema]:
        if status_update.name:
            await self.exists_by_name(
                status_update.name, already_exists_exc=EmployeeEventStatusNameTaken
            )
        try:
            orm_record = await self.get_by_id(status_id)
            updated = await self.update(orm_record, status_update, partial=True)
            schema = EmployeeEventStatusSchema.model_validate(updated)
            detail = await self._resolve_domain_success(
                EmployeeEventStatusUpdateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                EmployeeEventStatusNameTaken(status_update.name)
            )

    async def delete_employee_event_status(self, status_id: int) -> None:
        record = await self.get_by_id(status_id)
        await self.delete_by_id(
            status_id,
            name=record.name,
            delete_error_exc=EmployeeEventStatusDeleteError,
            delete_success_exc=EmployeeEventStatusDeleteSuccess,
        )
