from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.base.errors import DomainError
from backend.api_v1.job_job_group_link.job_job_group_link_repository import (
    JobJobGroupLinkRepository,
)
from backend.api_v1.job_job_group_link.job_job_group_link_model import JobJobGroupLink
from backend.api_v1.job_job_group_link.job_job_group_link_schema import (
    JobJobGroupLink as JobJobGroupLinkSchema,
    JobJobGroupLinkCreate,
    JobJobGroupLinkBulkSet,
)
from backend.api_v1.job_job_group_link.job_job_group_link_errors import (
    JobJobGroupLinkNotFound,
    JobAlreadyInJobGroup,
    JobJobGroupLinkDeleteError,
    JobGroupTypeSingletonViolation,
    JobGroupNotFoundForLink,
    JobGroupsNotFoundForLink,
    JobNotFoundForLink,
)
from backend.api_v1.job_job_group_link.job_job_group_link_success import (
    JobJobGroupLinkCreateSuccess,
    JobJobGroupLinkDeleteSuccess,
    JobJobGroupLinkSetSuccess,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.job.job_model import Job
from backend.api_v1.job_group.job_group_model import JobGroup


class JobJobGroupLinkService(BaseService):
    def __init__(
        self,
        repository: JobJobGroupLinkRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _to_schema(self, link: JobJobGroupLink) -> JobJobGroupLinkSchema:
        schema = JobJobGroupLinkSchema.model_validate(link)
        if link.job:
            schema.job_name = link.job.name
        if link.job_group:
            schema.job_group_name = link.job_group.name
            jgt = getattr(link.job_group, "job_group_type", None)
            if jgt:
                schema.job_group_type_name = jgt.name
                schema.allow_multiple = jgt.allow_multiple
        return schema

    async def _get_job_or_raise(self, job_id: int) -> Job:
        from sqlalchemy import select
        from backend.api_v1.job.job_model import Job as JobModel
        result = await self.session.execute(
            select(JobModel).where(JobModel.id == job_id)
        )
        job = result.scalar_one_or_none()
        if not job:
            raise await self._resolve_domain_error(JobNotFoundForLink(job_id))
        return job

    async def _get_group_or_raise(self, job_group_id: int) -> JobGroup:
        from sqlalchemy import select
        result = await self.session.execute(
            select(JobGroup).where(JobGroup.id == job_group_id)
        )
        group = result.scalar_one_or_none()
        if not group:
            raise await self._resolve_domain_error(
                JobGroupNotFoundForLink(job_group_id)
            )
        return group

    async def _check_singleton(self, job: Job, group: JobGroup) -> None:
        """
        If the target group's type has allow_multiple=False, ensure the job
        does not already belong to another group of that type.
        """
        jgt = getattr(group, "job_group_type", None)
        if jgt is None or jgt.allow_multiple:
            return

        existing_link = await self.repository.get_existing_link_for_type(
            job_id=job.id, job_group_type_id=jgt.id
        )
        if existing_link and existing_link.job_group_id != group.id:
            existing_group = existing_link.job_group
            raise await self._resolve_domain_error(
                JobGroupTypeSingletonViolation(
                    job_name=job.name,
                    type_name=jgt.name,
                    existing_group_name=existing_group.name,
                )
            )

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    async def get_links_for_job(self, job_id: int) -> List[JobJobGroupLinkSchema]:
        links = await self.repository.get_links_for_job(job_id)
        return [self._to_schema(lnk) for lnk in links]

    async def get_link(
        self, job_id: int, job_group_id: int
    ) -> JobJobGroupLinkSchema:
        link = await self.repository.get_link(job_id, job_group_id)
        if not link:
            raise await self._resolve_domain_error(
                JobJobGroupLinkNotFound(job_id, job_group_id)
            )
        return self._to_schema(link)

    # ------------------------------------------------------------------
    # Write — add single link
    # ------------------------------------------------------------------

    async def add_link(
        self, payload: JobJobGroupLinkCreate
    ) -> MutationResponse[JobJobGroupLinkSchema]:
        job = await self._get_job_or_raise(payload.job_id)
        group = await self._get_group_or_raise(payload.job_group_id)

        # Duplicate check
        existing = await self.repository.get_link(payload.job_id, payload.job_group_id)
        if existing:
            raise await self._resolve_domain_error(
                JobAlreadyInJobGroup(job.name, group.name)
            )

        # Singleton constraint
        await self._check_singleton(job, group)

        link = JobJobGroupLink(job_id=payload.job_id, job_group_id=payload.job_group_id)
        created = await self.repository.create(link)
        # Re-fetch so relationships are loaded
        created = await self.repository.get_link(payload.job_id, payload.job_group_id)
        schema = self._to_schema(created)
        detail = await self._resolve_domain_success(
            JobJobGroupLinkCreateSuccess(job.name, group.name)
        )
        return MutationResponse(detail=detail, data=schema)

    # ------------------------------------------------------------------
    # Write — remove single link
    # ------------------------------------------------------------------

    async def remove_link(
        self, job_id: int, job_group_id: int
    ) -> None:
        job = await self._get_job_or_raise(job_id)
        group = await self._get_group_or_raise(job_group_id)

        link = await self.repository.get_link(job_id, job_group_id)
        if not link:
            raise await self._resolve_domain_error(
                JobJobGroupLinkNotFound(job_id, job_group_id)
            )

        await self.repository.delete(link)
        detail = await self._resolve_domain_success(
            JobJobGroupLinkDeleteSuccess(job.name, group.name)
        )
        from fastapi import HTTPException
        from starlette import status
        raise HTTPException(status_code=status.HTTP_200_OK, detail=detail)

    # ------------------------------------------------------------------
    # Write — bulk replace all links for a job
    # ------------------------------------------------------------------

    async def set_links(
        self, job_id: int, payload: JobJobGroupLinkBulkSet
    ) -> List[JobJobGroupLinkSchema]:
        job = await self._get_job_or_raise(job_id)

        # Validate all requested group IDs exist
        groups = await self.repository.get_groups_by_ids(payload.job_group_ids)
        found_ids = {g.id for g in groups}
        missing = set(payload.job_group_ids) - found_ids
        if missing:
            raise await self._resolve_domain_error(JobGroupsNotFoundForLink(missing))

        # Build a map for quick lookup
        group_map: dict[int, JobGroup] = {g.id: g for g in groups}

        # Check singleton constraints for all incoming groups
        # Group them by type; for types with allow_multiple=False, at most one is allowed
        type_groups: dict[int, list[int]] = {}
        for g in groups:
            jgt = getattr(g, "job_group_type", None)
            if jgt and not jgt.allow_multiple:
                type_groups.setdefault(jgt.id, []).append(g.id)
                if len(type_groups[jgt.id]) > 1:
                    # Two groups of the same singleton type in the payload itself
                    raise await self._resolve_domain_error(
                        JobGroupTypeSingletonViolation(
                            job_name=job.name,
                            type_name=jgt.name,
                            existing_group_name=group_map[type_groups[jgt.id][0]].name,
                        )
                    )

        # Replace links atomically
        await self.repository.delete_links_for_job(job_id)
        new_links = [
            JobJobGroupLink(job_id=job_id, job_group_id=gid)
            for gid in payload.job_group_ids
        ]
        if new_links:
            await self.repository.mass_create(new_links)

        links = await self.repository.get_links_for_job(job_id)
        return [self._to_schema(lnk) for lnk in links]
