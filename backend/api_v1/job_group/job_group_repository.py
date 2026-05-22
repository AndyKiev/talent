from typing import Optional, Sequence

from sqlalchemy import select
from sqlalchemy.engine import Result

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.job_group.job_group_model import JobGroup


class JobGroupRepository(BaseRepository):
    model = JobGroup

    async def get_all_job_groups(
        self, job_group_type_id: Optional[int] = None
    ) -> Sequence[JobGroup]:
        stmt = select(JobGroup).order_by(JobGroup.name)
        if job_group_type_id is not None:
            stmt = stmt.where(JobGroup.job_group_type_id == job_group_type_id)
        result: Result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_by_id(self, job_group_id: int) -> Optional[JobGroup]:
        stmt = select(JobGroup).where(JobGroup.id == job_group_id)
        result: Result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> Optional[JobGroup]:
        stmt = select(JobGroup).where(JobGroup.name == name)
        result: Result = await self.session.execute(stmt)
        return result.scalar_one_or_none()