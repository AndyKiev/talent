
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.job.job_model import Job
from backend.api_v1.job_category.job_category_model import JobCategory
from backend.api_v1.job_job_category_link.job_job_category_link_messages import (
    JobCategoryLinkClearAllSuccess,
    JobCategoryLinkSetSuccess,
    JobCategoryNotFoundForLink,
    JobNotFoundForCategoryLink,
)
from backend.api_v1.job_job_category_link.job_job_category_link_repository import (
    JobJobCategoryLinkRepository,
)
from backend.api_v1.job_job_category_link.job_job_category_link_schema import (
    JobJobCategoryClearAllResult,
)
from backend.api_v1.job_job_category_link.job_job_category_link_schema import (
    JobJobCategoryLink as JobJobCategoryLinkSchema,
)


class JobJobCategoryLinkService(BaseService):
    def __init__(
        self,
        repository: JobJobCategoryLinkRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)

    def _to_schema(self, link) -> JobJobCategoryLinkSchema:
        schema = JobJobCategoryLinkSchema.model_validate(link)
        if link.job:
            schema.job_name = link.job.name
        if link.job_category:
            schema.job_category_key = link.job_category.key
        return schema

    async def _get_job_or_raise(self, job_id: int) -> Job:
        job = await self.session.scalar(select(Job).where(Job.id == job_id))
        if not job:
            raise await self._resolve_domain_error(JobNotFoundForCategoryLink(job_id))
        return job

    async def _get_category_or_raise(self, job_category_id: int) -> JobCategory:
        category = await self.session.scalar(
            select(JobCategory).where(JobCategory.id == job_category_id)
        )
        if not category:
            raise await self._resolve_domain_error(
                JobCategoryNotFoundForLink(job_category_id)
            )
        return category

    async def get_for_job(self, job_id: int) -> JobJobCategoryLinkSchema | None:
        link = await self.repository.get_for_job(job_id)
        return self._to_schema(link) if link else None

    async def set_category_for_job(
        self, job_id: int, job_category_id: int
    ) -> MutationResponse[JobJobCategoryLinkSchema]:
        job = await self._get_job_or_raise(job_id)
        category = await self._get_category_or_raise(job_category_id)
        link = await self.repository.set_for_job(job_id, job_category_id)
        schema = self._to_schema(link)
        detail = await self._resolve_domain_success(
            JobCategoryLinkSetSuccess(category=category.key, job=job.name)
        )
        return MutationResponse(detail=detail, data=schema)

    async def clear_all(self) -> JobJobCategoryClearAllResult:
        """Deliberate bulk removal of every job ↔ category link."""
        count = await self.repository.clear_all()
        detail = await self._resolve_domain_success(
            JobCategoryLinkClearAllSuccess(count)
        )
        return JobJobCategoryClearAllResult(detail=detail, deleted_count=count)
