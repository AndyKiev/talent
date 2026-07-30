from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.recruitment_application_status.recruitment_application_status_messages import (
    RecruitmentApplicationStatusNotFound,
    RecruitmentApplicationStatusNotFoundByName,
)
from backend.api_v1.recruitment_application_status.recruitment_application_status_repository import (
    RecruitmentApplicationStatusRepository,
)
from backend.api_v1.recruitment_application_status.recruitment_application_status_schema import (
    RecruitmentApplicationStatusSchema,
)


class RecruitmentApplicationStatusService(BaseService):
    def __init__(
        self,
        repository: RecruitmentApplicationStatusRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int):
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(
                RecruitmentApplicationStatusNotFound(id)
            )
        return result

    async def get_by_status_name(self, name: str):
        result = await self.repository.get_by_field("name", name)
        if not result:
            raise await self._resolve_domain_error(
                RecruitmentApplicationStatusNotFoundByName(name)
            )
        return result

    async def get_recruitment_application_statuses(
        self,
    ) -> list[RecruitmentApplicationStatusSchema]:
        records = await self.get_all(sort=["sort_order", "id"])
        return [RecruitmentApplicationStatusSchema.model_validate(r) for r in records]
