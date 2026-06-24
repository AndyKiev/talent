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

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _to_schema(self, orm_group) -> JobGroupSchema:
        """Validate ORM → schema and denormalise type fields."""
        schema = JobGroupSchema.model_validate(orm_group)
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
        filters = (
            {"job_group_type_id": job_group_type_id} if job_group_type_id else None
        )
        records = await self.get_all(params=filters)
        return [self._to_schema(r) for r in records]

    async def get_job_group_by_id(self, job_group_id: int) -> JobGroupSchema:
        # BaseService.get_by_id raises a translated NotFoundError automatically
        record = await self.get_by_id(job_group_id)
        return self._to_schema(record)

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    async def create_job_group(
        self, group_in: JobGroupCreate
    ) -> MutationResponse[JobGroupSchema]:
        await self.exists_by_name(group_in.name, already_exists_exc=JobGroupNameTaken)
        record = await self.create(group_in)
        # Re-fetch so the selectin relationship is populated
        record = await self.repository.get_by_id(record.id)
        schema = self._to_schema(record)
        detail = await self._resolve_domain_success(JobGroupCreateSuccess(schema.name))
        return MutationResponse(detail=detail, data=schema)

    async def update_job_group(
        self,
        job_group_id: int,
        group_update: JobGroupUpdate,
        partial: bool = True,
    ) -> MutationResponse[JobGroupSchema]:
        orm_group = await self.get_by_id(job_group_id)
        if group_update.name and group_update.name != orm_group.name:
            await self.exists_by_name(
                group_update.name, already_exists_exc=JobGroupNameTaken
            )
        updated = await self.update(orm_group, group_update, partial=partial)
        updated = await self.repository.get_by_id(updated.id)
        schema = self._to_schema(updated)
        detail = await self._resolve_domain_success(JobGroupUpdateSuccess(schema.name))
        return MutationResponse(detail=detail, data=schema)

    async def delete_job_group(self, job_group_id: int) -> None:
        record = await self.get_job_group_by_id(job_group_id)
        await self.delete_by_id(
            job_group_id,
            name=record.name,
            delete_error_exc=JobGroupDeleteError,
            delete_success_exc=JobGroupDeleteSuccess,
        )
