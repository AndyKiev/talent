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
    SetLinkDepartmentTypes,
)
from backend.api_v1.job_process_role_link.job_process_role_link_department_type_model import (
    JobProcessRoleLinkDepartmentType,
)
from backend.api_v1.job_process_role_link.job_process_role_link_messages import (
    JobProcessRoleLinkNotFound,
    JobAlreadyLinkedToProcessRole,
    JobNotFoundForProcessRoleLink,
    ProcessRoleNotFoundForLink,
    DepartmentTypeNotFoundForLink,
)
from backend.api_v1.job_process_role_link.job_process_role_link_messages import (
    JobProcessRoleLinkCreateSuccess,
    JobProcessRoleLinkDeleteSuccess,
    JobProcessRoleLinkDepartmentTypesSetSuccess,
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

    async def _validate_department_type_ids(self, ids: list[int]) -> list[int]:
        """Deduplicated ids, each verified to exist."""
        from sqlalchemy import select
        from backend.api_v1.department_type.department_type_model import DepartmentType

        unique_ids = list(dict.fromkeys(ids))
        if not unique_ids:
            return []
        existing = set(
            (
                await self.session.scalars(
                    select(DepartmentType.id).where(DepartmentType.id.in_(unique_ids))
                )
            ).all()
        )
        for type_id in unique_ids:
            if type_id not in existing:
                raise await self._resolve_domain_error(
                    DepartmentTypeNotFoundForLink(type_id)
                )
        return unique_ids

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

        type_ids = await self._validate_department_type_ids(
            payload.department_type_ids
        )
        link = JobProcessRoleLink(
            job_id=payload.job_id, process_role_id=payload.process_role_id
        )
        created = await self.repository.create(link)
        if type_ids:
            for type_id in type_ids:
                self.session.add(
                    JobProcessRoleLinkDepartmentType(
                        job_process_role_link_id=created.id,
                        department_type_id=type_id,
                    )
                )
            await self.session.commit()
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
    # Write — replace the oversight-target department types of a link
    # ------------------------------------------------------------------

    async def set_department_types(
        self, link_id: int, payload: SetLinkDepartmentTypes
    ) -> MutationResponse[JobProcessRoleLinkSchema]:
        from sqlalchemy import select

        link = await self.session.scalar(
            select(JobProcessRoleLink).where(JobProcessRoleLink.id == link_id)
        )
        if not link:
            raise await self._resolve_domain_error(
                JobProcessRoleLinkNotFound(link_id, 0)
            )
        type_ids = await self._validate_department_type_ids(
            payload.department_type_ids
        )
        # delete-orphan cascade removes the dropped rows
        link.department_type_links = [
            JobProcessRoleLinkDepartmentType(
                job_process_role_link_id=link.id,
                department_type_id=type_id,
            )
            for type_id in type_ids
        ]
        await self.session.commit()
        await self.session.refresh(link)
        schema = self._to_schema(link)
        detail = await self._resolve_domain_success(
            JobProcessRoleLinkDepartmentTypesSetSuccess(
                link.job.name if link.job else "?",
                link.process_role.name if link.process_role else "?",
                len(type_ids),
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
