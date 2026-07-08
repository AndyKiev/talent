from typing import Optional, List

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_training_status.employee_training_status_repository import (
    EmployeeTrainingStatusRepository,
)
from backend.api_v1.employee_training_status.employee_training_status_schema import (
    EmployeeTrainingStatus as EmployeeTrainingStatusSchema,
    EmployeeTrainingStatusCreate,
    EmployeeTrainingStatusUpdate,
)
from backend.api_v1.employee_training_status.employee_training_status_messages import (
    EmployeeTrainingStatusNotFound,
    EmployeeTrainingStatusKeyTaken,
    EmployeeTrainingStatusDeleteError,
)
from backend.api_v1.employee_training_status.employee_training_status_messages import (
    EmployeeTrainingStatusCreateSuccess,
    EmployeeTrainingStatusUpdateSuccess,
    EmployeeTrainingStatusDeleteSuccess,
)


class EmployeeTrainingStatusService(BaseService):
    def __init__(
        self,
        repository: EmployeeTrainingStatusRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int) -> EmployeeTrainingStatusSchema:
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(EmployeeTrainingStatusNotFound(id))
        return result

    async def get_employee_training_statuses(self) -> List[EmployeeTrainingStatusSchema]:
        records = await self.get_all(sort=["sort_order", "id"])
        return [EmployeeTrainingStatusSchema.model_validate(r) for r in records]

    async def get_id_by_key(self, key: str) -> Optional[int]:
        return await self.repository.get_id_by_field("key", key)

    async def create_employee_training_status(
        self, data: EmployeeTrainingStatusCreate
    ) -> MutationResponse[EmployeeTrainingStatusSchema]:
        existing = await self.repository.get_by_field("key", data.key)
        if existing:
            raise await self._resolve_domain_error(EmployeeTrainingStatusKeyTaken(data.key))
        try:
            # Append a fresh status at the end of the display order.
            all_statuses = await self.get_all()
            next_sort_order = (
                max((s.sort_order for s in all_statuses), default=-1) + 1
            )
            record = await self.create_from_dict(
                {**data.model_dump(), "sort_order": next_sort_order}
            )
            schema = EmployeeTrainingStatusSchema.model_validate(record)
            detail = await self._resolve_domain_success(
                EmployeeTrainingStatusCreateSuccess(schema.key)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(EmployeeTrainingStatusKeyTaken(data.key))

    async def update_employee_training_status(
        self, record_id: int, data: EmployeeTrainingStatusUpdate
    ) -> MutationResponse[EmployeeTrainingStatusSchema]:
        if data.key:
            existing = await self.repository.get_by_field("key", data.key)
            if existing and existing.id != record_id:
                raise await self._resolve_domain_error(
                    EmployeeTrainingStatusKeyTaken(data.key)
                )
        try:
            orm_record = await self.get_by_id(record_id)
            updated = await self.update(orm_record, data, partial=True)
            schema = EmployeeTrainingStatusSchema.model_validate(updated)
            detail = await self._resolve_domain_success(
                EmployeeTrainingStatusUpdateSuccess(schema.key)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(EmployeeTrainingStatusKeyTaken(data.key))

    async def delete_employee_training_status(self, record_id: int) -> None:
        record = await self.get_by_id(record_id)
        await self.delete_by_id(
            record_id,
            name=record.key,
            delete_error_exc=EmployeeTrainingStatusDeleteError,
            delete_success_exc=EmployeeTrainingStatusDeleteSuccess,
        )
