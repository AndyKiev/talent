from typing import List, Optional

from sqlalchemy import select

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.department_type_job_link.department_type_job_link_model import (
    DepartmentTypeJobLink,
)
from backend.api_v1.job.job_model import Job


class DepartmentTypeJobLinkRepository(BaseRepository):
    model = DepartmentTypeJobLink

    async def get_by_composite_key(
        self, department_type_id: int, job_id: int
    ) -> Optional[DepartmentTypeJobLink]:
        """Fetch a single link by its unique (department_type_id, job_id) pair."""
        return (
            await self.session.execute(
                select(DepartmentTypeJobLink).where(
                    DepartmentTypeJobLink.department_type_id == department_type_id,
                    DepartmentTypeJobLink.job_id == job_id,
                )
            )
        ).scalar_one_or_none()

    async def get_jobs_by_department_type(
        self,
        department_type_id: int,
        is_active: Optional[bool] = None,
    ) -> List[tuple]:
        """
        Return (Job, link_id, link_is_active) tuples for a given department type.
        When is_active=True, filters both link.is_active and job.is_active.
        """
        stmt = (
            select(
                Job,
                DepartmentTypeJobLink.id.label("link_id"),
                DepartmentTypeJobLink.is_active.label("link_is_active"),
            )
            .join(Job, Job.id == DepartmentTypeJobLink.job_id)
            .where(DepartmentTypeJobLink.department_type_id == department_type_id)
        )
        if is_active is True:
            stmt = stmt.where(
                DepartmentTypeJobLink.is_active == True,
                Job.is_active == True,
            )
        elif is_active is False:
            stmt = stmt.where(
                DepartmentTypeJobLink.is_active == False,
            )
        result = await self.session.execute(stmt)
        return result.all()
