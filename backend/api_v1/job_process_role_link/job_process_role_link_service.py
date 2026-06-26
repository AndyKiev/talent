from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.job_process_role_link.job_process_role_link_repository import (
    JobProcessRoleLinkRepository,
)
from backend.api_v1.job_process_role_link.job_process_role_link_model import (
    JobProcessRoleLink,
)
from backend.api_v1.job_process_role_link.job_process_role_link_schema import (
    JobProcessRoleLink as JobProcessRoleLinkSchema,
    JobProcessRoleLinkCreate,
)
from backend.api_v1.job_process_role_link.job_process_role_link_errors import (
    JobProcessRoleLinkNotFound,
    JobAlreadyLinkedToProcessRole,
    JobNotFoundForProcessRoleLink,
    ProcessRoleNotFoundForLink,
)
from backend.api_v1.job_process_role_link.job_process_role_link_success import (
    JobProcessRoleLinkCreateSuccess,
    JobProcessRoleLinkDeleteSuccess,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.job.job_model import Job
from backend.api_v1.process_roles.process_role.process_role_model import ProcessRole


class JobProcessRoleLinkService(BaseService):
    def __init__(
        self,
        repository: JobProcessRoleLinkRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _to_schema(self, link: JobProcessRoleLink) -> JobProcessRoleLinkSchema:
        schema = JobProcessRoleLinkSchema.model_validate(link)
        if link.job:
            schema.job_name = link.job.name
        if link.process_role:
            schema.role_name = link.process_role.name
            pr = link.process_role
            if pr.process:
                schema.process_name = pr.process.name
        return schema

    async def _get_job_or_raise(self, job_id: int) -> Job:
        from sqlalchemy import select

        result = await self.session.execute(
            select(Job).where(Job.id == job_id)
        )
        job = result.scalar_one_or_none()
        if not job:
            raise await self._resolve_domain_error(
                JobNotFoundForProcessRoleLink(job_id)
            )
        return job

    async def _get_process_role_or_raise(
        self, process_role_id: int
    ) -> ProcessRole:
        from sqlalchemy import select

        result = await self.session.execute(
            select(ProcessRole).where(ProcessRole.id == process_role_id)
        )
        role = result.scalar_one_or_none()
        if not role:
            raise await self._resolve_domain_error(
                ProcessRoleNotFoundForLink(process_role_id)
            )
        return role

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    async def get_links_for_job(
        self, job_id: int
    ) -> List[JobProcessRoleLinkSchema]:
        links = await self.repository.get_links_for_job(job_id)
        return [self._to_schema(lnk) for lnk in links]

    # ------------------------------------------------------------------
    # Write — add link
    # ------------------------------------------------------------------

    async def add_link(
        self, payload: JobProcessRoleLinkCreate
    ) -> MutationResponse[JobProcessRoleLinkSchema]:
        job = await self._get_job_or_raise(payload.job_id)
        role = await self._get_process_role_or_raise(payload.process_role_id)

        # Duplicate check
        existing = await self.repository.get_link(
            payload.job_id, payload.process_role_id
        )
        if existing:
            raise await self._resolve_domain_error(
                JobAlreadyLinkedToProcessRole(
                    job.name,
                    role.process.name if role.process else "?",
                    role.name,
                )
            )

        link = JobProcessRoleLink(
            job_id=payload.job_id, process_role_id=payload.process_role_id
        )
        created = await self.repository.create(link)
        # Re-fetch so relationships are loaded
        created = await self.repository.get_link(
            payload.job_id, payload.process_role_id
        )
        schema = self._to_schema(created)
        detail = await self._resolve_domain_success(
            JobProcessRoleLinkCreateSuccess(
                job.name,
                role.process.name if role.process else "?",
                role.name,
            )
        )
        return MutationResponse(detail=detail, data=schema)

    # ------------------------------------------------------------------
    # Write — remove link
    # ------------------------------------------------------------------

    async def remove_link(
        self, job_id: int, process_role_id: int
    ) -> None:
        job = await self._get_job_or_raise(job_id)
        role = await self._get_process_role_or_raise(process_role_id)

        link = await self.repository.get_link(job_id, process_role_id)
        if not link:
            raise await self._resolve_domain_error(
                JobProcessRoleLinkNotFound(job_id, process_role_id)
            )

        await self.repository.delete(link)
        detail = await self._resolve_domain_success(
            JobProcessRoleLinkDeleteSuccess(
                job.name,
                role.process.name if role.process else "?",
                role.name,
            )
        )
        from fastapi import HTTPException
        from starlette import status

        raise HTTPException(status_code=status.HTTP_200_OK, detail=detail)
