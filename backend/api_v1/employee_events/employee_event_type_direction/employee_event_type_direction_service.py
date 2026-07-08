from typing import Optional, List

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee_events.employee_event_type_direction.employee_event_type_direction_repository import (
    EmployeeEventTypeDirectionRepository,
)
from backend.api_v1.employee_events.employee_event_type_direction.employee_event_type_direction_schema import (
    EmployeeEventTypeDirection as EmployeeEventTypeDirectionSchema,
    EmployeeEventTypeDirectionCreate,
    EmployeeEventTypeDirectionUpdate,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_events.employee_event_type_direction.employee_event_type_direction_messages import (
    EmployeeEventTypeDirectionNotFound,
    EmployeeEventTypeDirectionDeleteError,
    EmployeeEventTypeDirectionDuplicate,
)
from backend.api_v1.employee_events.employee_event_type_direction.employee_event_type_direction_messages import (
    EmployeeEventTypeDirectionDeleteSuccess,
    EmployeeEventTypeDirectionCreateSuccess,
    EmployeeEventTypeDirectionUpdateSuccess,
)


class EmployeeEventTypeDirectionService(BaseService):
    def __init__(
        self,
        repository: EmployeeEventTypeDirectionRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, direction_id: int) -> EmployeeEventTypeDirectionSchema:
        result = await self.repository.get_by_id(direction_id)
        if not result:
            raise await self._resolve_domain_error(
                EmployeeEventTypeDirectionNotFound(direction_id)
            )
        return result

    async def get_type_directions(
        self,
        event_type_id: int,
        sort: Optional[str] = None,
    ) -> List[EmployeeEventTypeDirectionSchema]:
        records = await self.repository.get_all(
            filters={"event_type_id": event_type_id},
            sort=sort,
        )
        return [EmployeeEventTypeDirectionSchema.model_validate(r) for r in records]

    async def create_type_direction(
        self,
        event_type_id: int,
        direction_in: EmployeeEventTypeDirectionCreate,
    ) -> MutationResponse[EmployeeEventTypeDirectionSchema]:
        # Guard: unique (event_type_id, direction_type_id)
        existing = await self.repository.get_all(
            filters={
                "event_type_id": event_type_id,
                "direction_type_id": direction_in.direction_type_id,
            }
        )
        if existing:
            raise await self._resolve_domain_error(
                EmployeeEventTypeDirectionDuplicate(
                    event_type_id, direction_in.direction_type_id
                )
            )
        try:
            data = direction_in.model_dump()
            data["event_type_id"] = event_type_id
            record = await self.repository.create_from_dict(data)
            schema = EmployeeEventTypeDirectionSchema.model_validate(record)
            detail = await self._resolve_domain_success(
                EmployeeEventTypeDirectionCreateSuccess(schema.id)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                EmployeeEventTypeDirectionDuplicate(
                    event_type_id, direction_in.direction_type_id
                )
            )

    async def update_type_direction(
        self,
        direction_id: int,
        direction_update: EmployeeEventTypeDirectionUpdate,
    ) -> MutationResponse[EmployeeEventTypeDirectionSchema]:
        orm_record = await self.get_by_id(direction_id)
        updated = await self.update(orm_record, direction_update, partial=True)
        schema = EmployeeEventTypeDirectionSchema.model_validate(updated)
        detail = await self._resolve_domain_success(
            EmployeeEventTypeDirectionUpdateSuccess(schema.id)
        )
        return MutationResponse(detail=detail, data=schema)

    async def delete_type_direction(self, direction_id: int) -> None:
        await self.get_by_id(direction_id)
        await self.delete_by_id(
            direction_id,
            name=direction_id,
            delete_error_exc=EmployeeEventTypeDirectionDeleteError,
            delete_success_exc=EmployeeEventTypeDirectionDeleteSuccess,
        )
