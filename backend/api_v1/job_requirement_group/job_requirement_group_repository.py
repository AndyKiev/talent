from sqlalchemy import update

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.job_requirement_group.job_requirement_group_model import (
    JobRequirementGroup,
)


class JobRequirementGroupRepository(BaseRepository):
    model = JobRequirementGroup

    async def deactivate_all_for_job(self, job_id: int) -> None:
        """Deactivate every group of the job (before activating one of them)."""
        await self.session.execute(
            update(JobRequirementGroup)
            .where(JobRequirementGroup.job_id == job_id)
            .values(is_active=False)
        )
