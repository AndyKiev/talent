from typing import Optional, Sequence

from sqlalchemy import select, delete

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.job_job_group_link.job_job_group_link_model import JobJobGroupLink
from backend.api_v1.job_group.job_group_model import JobGroup
from backend.api_v1.job_group_type.job_group_type_model import JobGroupType


class JobJobGroupLinkRepository(BaseRepository):
    model = JobJobGroupLink

    async def get_link(
        self, job_id: int, job_group_id: int
    ) -> Optional[JobJobGroupLink]:
        stmt = select(JobJobGroupLink).where(
            JobJobGroupLink.job_id == job_id,
            JobJobGroupLink.job_group_id == job_group_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_links_for_job(self, job_id: int) -> Sequence[JobJobGroupLink]:
        stmt = select(JobJobGroupLink).where(JobJobGroupLink.job_id == job_id)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_existing_link_for_type(
        self, job_id: int, job_group_type_id: int
    ) -> Optional[JobJobGroupLink]:
        """
        Return any existing link for this job that belongs to the given
        job_group_type. Used to enforce the allow_multiple=False constraint.
        """
        stmt = (
            select(JobJobGroupLink)
            .join(JobGroup, JobJobGroupLink.job_group_id == JobGroup.id)
            .where(
                JobJobGroupLink.job_id == job_id,
                JobGroup.job_group_type_id == job_group_type_id,
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_job_groups_for_type(
        self, job_id: int, job_group_type_id: int
    ) -> Sequence[JobJobGroupLink]:
        """Return all links for a job within a given type (for allow_multiple=True)."""
        stmt = (
            select(JobJobGroupLink)
            .join(JobGroup, JobJobGroupLink.job_group_id == JobGroup.id)
            .where(
                JobJobGroupLink.job_id == job_id,
                JobGroup.job_group_type_id == job_group_type_id,
            )
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def delete_links_for_job(self, job_id: int) -> None:
        await self.session.execute(
            delete(JobJobGroupLink).where(JobJobGroupLink.job_id == job_id)
        )
        await self.session.commit()

    async def get_groups_by_ids(self, job_group_ids: list[int]) -> Sequence[JobGroup]:
        stmt = select(JobGroup).where(JobGroup.id.in_(job_group_ids))
        result = await self.session.execute(stmt)
        return result.scalars().all()
