from typing import Optional, List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.pipeline_status.pipeline_status_repository import (
    PipelineStatusRepository,
)
from backend.api_v1.pipeline_status.pipeline_status_schema import PipelineStatusSchema
from backend.api_v1.pipeline_status.pipeline_status_messages import (
    PipelineStatusNotFound,
    PipelineStatusNotFoundByName,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema


class PipelineStatusService(BaseService):
    def __init__(
        self,
        repository: PipelineStatusRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int):
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(PipelineStatusNotFound(id))
        return result

    async def get_by_status_name(self, name: str):
        result = await self.repository.get_by_field("name", name)
        if not result:
            raise await self._resolve_domain_error(PipelineStatusNotFoundByName(name))
        return result

    async def get_pipeline_statuses(self) -> List[PipelineStatusSchema]:
        records = await self.get_all(sort=["sort_order", "id"])
        return [PipelineStatusSchema.model_validate(r) for r in records]
