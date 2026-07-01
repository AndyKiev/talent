from typing import Optional

from sqlalchemy import select, delete, func

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.job_job_category_link.job_job_category_link_model import (
    JobJobCategoryLink,
)


class JobJobCategoryLinkRepository(BaseRepository):
    model = JobJobCategoryLink

    async def get_for_job(self, job_id: int) -> Optional[JobJobCategoryLink]:
        stmt = select(JobJobCategoryLink).where(JobJobCategoryLink.job_id == job_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def set_for_job(
        self, job_id: int, job_category_id: int
    ) -> JobJobCategoryLink:
        """Upsert: a job has at most one category, so replace any existing row."""
        await self.session.execute(
            delete(JobJobCategoryLink).where(JobJobCategoryLink.job_id == job_id)
        )
        link = JobJobCategoryLink(job_id=job_id, job_category_id=job_category_id)
        self.session.add(link)
        await self.session.commit()
        return await self.get_for_job(job_id)

    async def clear_all(self) -> int:
        """Delete every job ↔ category link. Returns the number removed."""
        total = await self.session.scalar(
            select(func.count()).select_from(JobJobCategoryLink)
        )
        await self.session.execute(delete(JobJobCategoryLink))
        await self.session.commit()
        return int(total or 0)
