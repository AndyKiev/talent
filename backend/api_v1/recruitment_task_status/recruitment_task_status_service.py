from typing import Optional, List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.recruitment_task_status.recruitment_task_status_repository import (
    RecruitmentTaskStatusRepository,
)
from backend.api_v1.recruitment_task_status.recruitment_task_status_schema import (
    RecruitmentTaskStatusSchema,
)
from backend.api_v1.recruitment_task_status.recruitment_task_status_messages import (
    RecruitmentTaskStatusNotFound,
    RecruitmentTaskStatusNotFoundByName,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema


class RecruitmentTaskStatusService(BaseService):
    def __init__(
        self,
        repository: RecruitmentTaskStatusRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int):
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(RecruitmentTaskStatusNotFound(id))
        return result

    async def get_by_status_name(self, name: str):
        result = await self.repository.get_by_field("name", name)
        if not result:
            raise await self._resolve_domain_error(
                RecruitmentTaskStatusNotFoundByName(name)
            )
        return result

    async def get_recruitment_task_statuses(self) -> List[RecruitmentTaskStatusSchema]:
        records = await self.get_all(sort=["id"])
        return [RecruitmentTaskStatusSchema.model_validate(r) for r in records]
