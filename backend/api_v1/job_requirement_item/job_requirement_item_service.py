from typing import Optional, List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.job_requirement_item.job_requirement_item_repository import (
    JobRequirementItemRepository,
)
from backend.api_v1.job_requirement_item.job_requirement_item_schema import (
    JobRequirementItemSchema,
    JobRequirementItemCreate,
    JobRequirementItemUpdate,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.job_requirement_item.job_requirement_item_messages import (
    JobRequirementItemNotFound,
    JobRequirementItemDeleteError,
    JobRequirementItemDeleteSuccess,
    JobRequirementItemCreateSuccess,
    JobRequirementItemUpdateSuccess,
)


class JobRequirementItemService(BaseService):
    def __init__(
        self,
        repository: JobRequirementItemRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int):
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(JobRequirementItemNotFound(id))
        return result

    async def get_job_requirement_items(
        self,
        group_id: Optional[int] = None,
    ) -> List[JobRequirementItemSchema]:
        filters = {}
        if group_id is not None:
            filters["group_id"] = group_id
        records = await self.get_all(params=filters or None, sort=["sort_order", "id"])
        return [JobRequirementItemSchema.model_validate(r) for r in records]

    async def create_job_requirement_item(
        self, item_in: JobRequirementItemCreate
    ) -> MutationResponse[JobRequirementItemSchema]:
        record = await self.create(item_in)
        schema = JobRequirementItemSchema.model_validate(record)
        detail = await self._resolve_domain_success(
            JobRequirementItemCreateSuccess(str(schema.id))
        )
        return MutationResponse(detail=detail, data=schema)

    async def update_job_requirement_item(
        self, item_id: int, item_update: JobRequirementItemUpdate
    ) -> MutationResponse[JobRequirementItemSchema]:
        orm_record = await self.get_by_id(item_id)
        updated = await self.update(orm_record, item_update, partial=True)
        schema = JobRequirementItemSchema.model_validate(updated)
        detail = await self._resolve_domain_success(
            JobRequirementItemUpdateSuccess(str(schema.id))
        )
        return MutationResponse(detail=detail, data=schema)

    async def delete_job_requirement_item(self, item_id: int) -> None:
        record = await self.get_by_id(item_id)
        await self.delete_by_id(
            item_id,
            name=str(record.id),
            delete_error_exc=JobRequirementItemDeleteError,
            delete_success_exc=JobRequirementItemDeleteSuccess,
        )
