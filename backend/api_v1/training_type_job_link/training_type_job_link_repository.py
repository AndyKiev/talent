from collections.abc import Sequence

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.job.job_model import Job
from backend.api_v1.training_type.training_type_model import TrainingType
from backend.api_v1.training_type_job_link.training_type_job_link_model import (
    TrainingTypeJobLink,
)
from sqlalchemy import delete, select


class TrainingTypeJobLinkRepository(BaseRepository):
    model = TrainingTypeJobLink

    async def get_links_for_training_type(
        self, training_type_id: int
    ) -> Sequence[TrainingTypeJobLink]:
        stmt = select(TrainingTypeJobLink).where(
            TrainingTypeJobLink.training_type_id == training_type_id
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_links_for_job(self, job_id: int) -> Sequence[TrainingTypeJobLink]:
        stmt = select(TrainingTypeJobLink).where(TrainingTypeJobLink.job_id == job_id)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def delete_links_for_training_type(self, training_type_id: int) -> None:
        await self.session.execute(
            delete(TrainingTypeJobLink).where(
                TrainingTypeJobLink.training_type_id == training_type_id
            )
        )
        await self.session.commit()

    async def delete_links_for_job(self, job_id: int) -> None:
        await self.session.execute(
            delete(TrainingTypeJobLink).where(TrainingTypeJobLink.job_id == job_id)
        )
        await self.session.commit()

    async def get_jobs_by_ids(self, job_ids: list[int]) -> Sequence[Job]:
        stmt = select(Job).where(Job.id.in_(job_ids))
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_training_types_by_ids(
        self, training_type_ids: list[int]
    ) -> Sequence[TrainingType]:
        stmt = select(TrainingType).where(TrainingType.id.in_(training_type_ids))
        result = await self.session.execute(stmt)
        return result.scalars().all()
