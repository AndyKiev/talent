
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.job_group_type.job_group_type_messages import (
    JobGroupTypeCreateSuccess,
    JobGroupTypeDeleteError,
    JobGroupTypeDeleteSuccess,
    JobGroupTypeNameTaken,
    JobGroupTypeNotFound,
    JobGroupTypeUpdateSuccess,
)
from backend.api_v1.job_group_type.job_group_type_repository import (
    JobGroupTypeRepository,
)
from backend.api_v1.job_group_type.job_group_type_schema import (
    JobGroupType as JobGroupTypeSchema,
)
from backend.api_v1.job_group_type.job_group_type_schema import (
    JobGroupTypeCreate,
    JobGroupTypeUpdate,
)


class JobGroupTypeService(BaseService):
    def __init__(
        self,
        repository: JobGroupTypeRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    async def get_job_group_types(
        self, name: str | None = None, sort: str | None = None
    ) -> list[JobGroupTypeSchema]:
        if name:
            record = await self.get_by_name(name, not_found_exc=JobGroupTypeNotFound)
            return [JobGroupTypeSchema.model_validate(record)]
        records = await self.get_all(sort_json=sort)
        return [JobGroupTypeSchema.model_validate(r) for r in records]

    async def get_job_group_type_by_id(
        self, job_group_type_id: int
    ) -> JobGroupTypeSchema:
        record = await self.get_by_id(job_group_type_id)
        return JobGroupTypeSchema.model_validate(record)

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    async def create_job_group_type(
        self, type_in: JobGroupTypeCreate
    ) -> MutationResponse[JobGroupTypeSchema]:
        await self.exists_by_name(
            type_in.name, already_exists_exc=JobGroupTypeNameTaken
        )
        record = await self.create(type_in)
        schema = JobGroupTypeSchema.model_validate(record)
        detail = await self._resolve_domain_success(
            JobGroupTypeCreateSuccess(schema.name)
        )
        return MutationResponse(detail=detail, data=schema)

    async def update_job_group_type(
        self, job_group_type_id: int, type_update: JobGroupTypeUpdate
    ) -> MutationResponse[JobGroupTypeSchema]:
        orm_record = await self.get_by_id(job_group_type_id)
        if type_update.name and type_update.name != orm_record.name:
            await self.exists_by_name(
                type_update.name, already_exists_exc=JobGroupTypeNameTaken
            )
        updated = await self.update(orm_record, type_update, partial=True)
        schema = JobGroupTypeSchema.model_validate(updated)
        detail = await self._resolve_domain_success(
            JobGroupTypeUpdateSuccess(schema.name)
        )
        return MutationResponse(detail=detail, data=schema)

    async def delete_job_group_type(self, job_group_type_id: int) -> None:
        record = await self.get_job_group_type_by_id(job_group_type_id)
        await self.delete_by_id(
            job_group_type_id,
            name=record.name,
            delete_error_exc=JobGroupTypeDeleteError,
            delete_success_exc=JobGroupTypeDeleteSuccess,
        )
