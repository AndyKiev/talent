from collections.abc import Sequence

from sqlalchemy import select

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.job_process_role_link.job_process_role_link_model import (
    JobProcessRoleLink,
)


class JobProcessRoleLinkRepository(BaseRepository):
    model = JobProcessRoleLink

    async def get_link(
        self, job_id: int, process_role_id: int
    ) -> JobProcessRoleLink | None:
        stmt = select(JobProcessRoleLink).where(
            JobProcessRoleLink.job_id == job_id,
            JobProcessRoleLink.process_role_id == process_role_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_links_for_job(self, job_id: int) -> Sequence[JobProcessRoleLink]:
        stmt = select(JobProcessRoleLink).where(
            JobProcessRoleLink.job_id == job_id
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()
