from typing import Sequence

from sqlalchemy import select, delete

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.training_type_job_category_link.training_type_job_category_link_model import (
    TrainingTypeJobCategoryLink,
)
from backend.api_v1.job_category.job_category_model import JobCategory


class TrainingTypeJobCategoryLinkRepository(BaseRepository):
    model = TrainingTypeJobCategoryLink

    async def get_links_for_training_type(
        self, training_type_id: int
    ) -> Sequence[TrainingTypeJobCategoryLink]:
        stmt = select(TrainingTypeJobCategoryLink).where(
            TrainingTypeJobCategoryLink.training_type_id == training_type_id
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_links_for_job_category(
        self, job_category_id: int
    ) -> Sequence[TrainingTypeJobCategoryLink]:
        stmt = select(TrainingTypeJobCategoryLink).where(
            TrainingTypeJobCategoryLink.job_category_id == job_category_id
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def delete_links_for_training_type(self, training_type_id: int) -> None:
        await self.session.execute(
            delete(TrainingTypeJobCategoryLink).where(
                TrainingTypeJobCategoryLink.training_type_id == training_type_id
            )
        )
        await self.session.commit()

    async def get_job_categories_by_ids(
        self, job_category_ids: list[int]
    ) -> Sequence[JobCategory]:
        stmt = select(JobCategory).where(JobCategory.id.in_(job_category_ids))
        result = await self.session.execute(stmt)
        return result.scalars().all()
