from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.training_type.training_type_model import TrainingType
from backend.api_v1.training_type_job_category_link.training_type_job_category_link_repository import (
    TrainingTypeJobCategoryLinkRepository,
)
from backend.api_v1.training_type_job_category_link.training_type_job_category_link_schema import (
    TrainingTypeJobCategoryLink as TrainingTypeJobCategoryLinkSchema,
    TrainingTypeJobCategoryLinkBulkSet,
)
from backend.api_v1.training_type_job_category_link.training_type_job_category_link_messages import (
    TrainingTypeNotFoundForJobCategoryLink,
    JobCategoriesNotFoundForTrainingTypeLink,
)
from backend.api_v1.training_type_job_category_link.training_type_job_category_link_messages import (
    TrainingTypeJobCategoryLinkSetSuccess,
)
from backend.api_v1.base.mutation_response import MutationResponse


class TrainingTypeJobCategoryLinkService(BaseService):
    def __init__(
        self,
        repository: TrainingTypeJobCategoryLinkRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    def _to_schema(self, link) -> TrainingTypeJobCategoryLinkSchema:
        schema = TrainingTypeJobCategoryLinkSchema.model_validate(link)
        if link.job_category:
            schema.job_category_key = link.job_category.key
        if link.training_type:
            schema.training_type_name = link.training_type.name
        return schema

    async def _get_training_type_or_raise(self, training_type_id: int) -> TrainingType:
        record = await self.session.scalar(
            select(TrainingType).where(TrainingType.id == training_type_id)
        )
        if not record:
            raise await self._resolve_domain_error(
                TrainingTypeNotFoundForJobCategoryLink(training_type_id)
            )
        return record

    async def get_links_for_training_type(
        self, training_type_id: int
    ) -> List[TrainingTypeJobCategoryLinkSchema]:
        links = await self.repository.get_links_for_training_type(training_type_id)
        return [self._to_schema(lnk) for lnk in links]

    async def get_links_for_job_category(
        self, job_category_id: int
    ) -> List[TrainingTypeJobCategoryLinkSchema]:
        links = await self.repository.get_links_for_job_category(job_category_id)
        return [self._to_schema(lnk) for lnk in links]

    async def set_links(
        self, training_type_id: int, payload: TrainingTypeJobCategoryLinkBulkSet
    ) -> MutationResponse[List[TrainingTypeJobCategoryLinkSchema]]:
        training_type = await self._get_training_type_or_raise(training_type_id)

        categories = await self.repository.get_job_categories_by_ids(
            payload.job_category_ids
        )
        found_ids = {c.id for c in categories}
        missing = set(payload.job_category_ids) - found_ids
        if missing:
            raise await self._resolve_domain_error(
                JobCategoriesNotFoundForTrainingTypeLink(missing)
            )

        await self.repository.delete_links_for_training_type(training_type_id)
        new_links = [
            self.repository.model(training_type_id=training_type_id, job_category_id=cid)
            for cid in payload.job_category_ids
        ]
        if new_links:
            await self.repository.mass_create(new_links)

        links = await self.repository.get_links_for_training_type(training_type_id)
        schemas = [self._to_schema(lnk) for lnk in links]
        detail = await self._resolve_domain_success(
            TrainingTypeJobCategoryLinkSetSuccess(training_type.name, len(schemas))
        )
        return MutationResponse(detail=detail, data=schemas)
