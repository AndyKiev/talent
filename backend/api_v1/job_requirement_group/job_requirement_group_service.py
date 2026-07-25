
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.job_requirement_group.job_requirement_group_messages import (
    JobRequirementGroupCreateSuccess,
    JobRequirementGroupDeleteError,
    JobRequirementGroupDeleteSuccess,
    JobRequirementGroupNotFound,
    JobRequirementGroupUpdateSuccess,
)
from backend.api_v1.job_requirement_group.job_requirement_group_repository import (
    JobRequirementGroupRepository,
)
from backend.api_v1.job_requirement_group.job_requirement_group_schema import (
    JobRequirementGroupCreate,
    JobRequirementGroupSchema,
    JobRequirementGroupUpdate,
)


class JobRequirementGroupService(BaseService):
    def __init__(
        self,
        repository: JobRequirementGroupRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int):
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(JobRequirementGroupNotFound(id))
        return result

    async def get_job_requirement_groups(
        self,
        job_id: int | None = None,
        is_active: bool | None = None,
    ) -> list[JobRequirementGroupSchema]:
        filters = {}
        if job_id is not None:
            filters["job_id"] = job_id
        if is_active is not None:
            filters["is_active"] = is_active
        records = await self.get_all(params=filters or None, sort=["id"])
        return [JobRequirementGroupSchema.model_validate(r) for r in records]

    async def create_job_requirement_group(
        self, group_in: JobRequirementGroupCreate
    ) -> MutationResponse[JobRequirementGroupSchema]:
        if group_in.is_active:
            await self.repository.deactivate_all_for_job(group_in.job_id)
        record = self.repository.model(**group_in.model_dump(), created_by=self.user.id)
        record = await self.repository.create(instance=record)
        schema = JobRequirementGroupSchema.model_validate(record)
        detail = await self._resolve_domain_success(
            JobRequirementGroupCreateSuccess(schema.name)
        )
        return MutationResponse(detail=detail, data=schema)

    async def update_job_requirement_group(
        self, group_id: int, group_update: JobRequirementGroupUpdate
    ) -> MutationResponse[JobRequirementGroupSchema]:
        orm_record = await self.get_by_id(group_id)
        if group_update.is_active:
            # Activating this group deactivates its siblings (one active per job).
            await self.repository.deactivate_all_for_job(orm_record.job_id)
        updated = await self.update(orm_record, group_update, partial=True)
        schema = JobRequirementGroupSchema.model_validate(updated)
        detail = await self._resolve_domain_success(
            JobRequirementGroupUpdateSuccess(schema.name)
        )
        return MutationResponse(detail=detail, data=schema)

    async def delete_job_requirement_group(self, group_id: int) -> None:
        record = await self.get_by_id(group_id)
        # Tasks reference groups with ondelete=RESTRICT — delete_by_id turns the
        # IntegrityError into the domain "in use by recruitment tasks" message.
        await self.delete_by_id(
            group_id,
            name=record.name,
            delete_error_exc=JobRequirementGroupDeleteError,
            delete_success_exc=JobRequirementGroupDeleteSuccess,
        )
