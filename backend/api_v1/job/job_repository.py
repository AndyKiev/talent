from typing import List, Tuple

from sqlalchemy import select, delete

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.job.job_model import Job
from backend.api_v1.user_group.user_group_model import UserGroup
from backend.api_v1.table_relationship_links.job_user_group_link_model import JobUserGroupLink
from backend.api_v1.job.job_errors import (
    JobNotFound,
    JobAlreadyInGroup,
    JobNotInGroup,
    GroupNotFound,
    GroupsNotFound,
)


class JobRepository(BaseRepository):
    model = Job

    async def _get_job_and_group(
        self, job_id: int, group_id: int
    ) -> Tuple[Job, UserGroup]:
        """Get job and group by IDs, raise appropriate errors if not found"""
        job = await self.get_by_id(job_id)
        if not job:
            raise JobNotFound(job_id)

        group = (
            await self.session.execute(
                select(UserGroup).where(UserGroup.id == group_id)
            )
        ).scalar_one_or_none()
        if not group:
            raise GroupNotFound(group_id)

        return job, group

    async def _get_association(
        self, job_id: int, group_id: int
    ) -> JobUserGroupLink | None:
        """Get association between job and group if exists"""
        return (
            await self.session.execute(
                select(JobUserGroupLink).where(
                    JobUserGroupLink.job_id == job_id,
                    JobUserGroupLink.user_group_id == group_id,
                )
            )
        ).scalar_one_or_none()

    async def add_to_group(self, job_id: int, user_group_id: int) -> Job:
        job, group = await self._get_job_and_group(job_id, user_group_id)
        association = await self._get_association(job_id, user_group_id)
        if association:
            raise JobAlreadyInGroup(job.name, group.name)

        self.session.add(JobUserGroupLink(job_id=job_id, user_group_id=user_group_id))
        await self.session.commit()
        return await self.get_by_id(job_id)

    async def remove_from_group(self, job_id: int, user_group_id: int) -> Job:
        job, group = await self._get_job_and_group(job_id, user_group_id)
        association = await self._get_association(job_id, user_group_id)
        if not association:
            raise JobNotInGroup(job.name, group.name)

        await self.session.delete(association)
        await self.session.commit()
        return await self.get_by_id(job_id)

    async def set_groups(self, job_id: int, user_group_ids: List[int]) -> Job:
        """Replace all group table_relationship_links for a job"""
        if not await self.get_by_id(job_id):
            raise JobNotFound(job_id)
        existing_groups = (
            (
                await self.session.execute(
                    select(UserGroup).where(UserGroup.id.in_(user_group_ids))
                )
            )
            .scalars()
            .all()
        )

        if len(existing_groups) != len(user_group_ids):
            missing = set(user_group_ids) - {g.id for g in existing_groups}
            raise GroupsNotFound(missing)

        await self.session.execute(
            delete(JobUserGroupLink).where(JobUserGroupLink.job_id == job_id)
        )
        self.session.add_all(
            [
                JobUserGroupLink(job_id=job_id, user_group_id=gid)
                for gid in user_group_ids
            ]
        )
        await self.session.commit()
        return await self.get_by_id(job_id)
