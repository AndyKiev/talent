from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.job_group.job_group_repository import JobGroupRepository
from backend.api_v1.job_group.job_group_schema import (
    JobGroup as JobGroupSchema,
    JobGroupCreate,
    JobGroupUpdate,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.job_group.job_group_errors import (
    JobGroupNotFound,
    JobGroupNameTaken,
    JobGroupDeleteError,
)
from backend.api_v1.job_group.job_group_success import (
    JobGroupCreateSuccess,
    JobGroupUpdateSuccess,
    JobGroupDeleteSuccess,
)


class JobGroupService(BaseService):
    def __init__(
        self,
        repository: JobGroupRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)
        self.current_user = user

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _to_schema(self, orm_group: object) -> JobGroupSchema:
        schema = JobGroupSchema.model_validate(orm_group)
        # Enrich with denormalised type fields if the relationship was loaded
        jgt = getattr(orm_group, "job_group_type", None)
        if jgt is not None:
            schema.job_group_type_name = jgt.name
            schema.allow_multiple = jgt.allow_multiple
        return schema

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    async def get_job_groups(
        self, job_group_type_id: Optional[int] = None
    ) -> List[JobGroupSchema]:
        groups = await self.repository.get_all_job_groups(
            job_group_type_id=job_group_type_id
        )
        return [self._to_schema(g) for g in groups]

    async def get_job_group_by_id(self, job_group_id: int) -> JobGroupSchema:
        record = await self.repository.get_by_id(job_group_id)
        if not record:
            raise await self._resolve_domain_error(JobGroupNotFound(job_group_id))
        return self._to_schema(record)

    async def get_job_group_by_name(self, name: str) -> Optional[JobGroupSchema]:
        record = await self.repository.get_by_name(name)
        return self._to_schema(record) if record else None

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    async def create_job_group(
        self, group_in: JobGroupCreate
    ) -> MutationResponse[JobGroupSchema]:
        existing = await self.repository.get_by_name(group_in.name)
        if existing:
            raise await self._resolve_domain_error(JobGroupNameTaken(group_in.name))
        orm_group = self.repository.model(**group_in.model_dump())
        created = await self.repository.create(orm_group)
        # Re-fetch to load the relationship (needed for _to_schema)
        created = await self.repository.get_by_id(created.id)
        schema = self._to_schema(created)
        detail = await self._resolve_domain_success(JobGroupCreateSuccess(schema.name))
        return MutationResponse(detail=detail, data=schema)

    async def update_job_group(
        self,
        job_group_id: int,
        group_update: JobGroupUpdate,
        partial: bool = True,
    ) -> MutationResponse[JobGroupSchema]:
        orm_group = await self.repository.get_by_id(job_group_id)
        if not orm_group:
            raise await self._resolve_domain_error(JobGroupNotFound(job_group_id))
        if group_update.name and group_update.name != orm_group.name:
            existing = await self.repository.get_by_name(group_update.name)
            if existing:
                raise await self._resolve_domain_error(
                    JobGroupNameTaken(group_update.name)
                )
        update_data = group_update.model_dump(exclude_unset=partial)
        updated = await self.repository.update(orm_group, update_data)
        updated = await self.repository.get_by_id(updated.id)
        schema = self._to_schema(updated)
        detail = await self._resolve_domain_success(JobGroupUpdateSuccess(schema.name))
        return MutationResponse(detail=detail, data=schema)

    async def delete_job_group(self, job_group_id: int) -> None:
        group = await self.get_job_group_by_id(job_group_id)
        await self.delete_by_id(
            job_group_id,
            name=group.name,
            delete_error_exc=JobGroupDeleteError,
            delete_success_exc=JobGroupDeleteSuccess,
        )