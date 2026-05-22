from typing import List, Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.job.job_repository import JobRepository
from backend.api_v1.job.job_schema import Job as JobSchema, JobCreate, JobUpdate
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.job.job_errors import (
    JobNotFound,
    JobNameTaken,
    JobDeleteError,
    JobNotFoundByName,
)
from backend.api_v1.job.job_success import (
    JobDeleteSuccess,
    JobCreateSuccess,
    JobUpdateSuccess,
)
from backend.api_v1.employee.employee_repository import EmployeeRepository
from backend.api_v1.employee.employee_service import EmployeeService, SyncJobResult
from backend.api_v1.base.errors import DomainError


class JobService(BaseService):
    def __init__(
        self,
        repository: JobRepository,
        user: Optional[UserSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    async def get_by_id(self, id: int) -> JobSchema:
        result = await self.repository.get_by_id(id)
        if not result:
            exc = JobNotFound(id)
            raise await self._resolve_domain_error(exc)
        return result

    async def get_jobs(
        self,
        name: Optional[str] = None,
        sort: Optional[str] = None,
    ) -> List[JobSchema]:
        if name:
            job = await self.get_by_name(name, not_found_exc=JobNotFoundByName)
            return [JobSchema.model_validate(job)]
        jobs = await self.get_all(sort_json=sort)
        return [JobSchema.model_validate(j) for j in jobs]

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    async def create_job(self, job_in: JobCreate) -> MutationResponse[JobSchema]:
        await self.exists_by_name(job_in.name, already_exists_exc=JobNameTaken)
        try:
            job = await self.create(job_in)
            schema = JobSchema.model_validate(job)
            detail = await self._resolve_domain_success(JobCreateSuccess(schema.name))
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(JobNameTaken(job_in.name))

    async def update_job(
        self, job_id: int, job_update: JobUpdate
    ) -> MutationResponse[JobSchema]:
        if job_update.name:
            await self.exists_by_name(job_update.name, already_exists_exc=JobNameTaken)
        try:
            orm_job = await self.get_by_id(job_id)
            updated = await self.update(orm_job, job_update, partial=True)
            schema = JobSchema.model_validate(updated)
            detail = await self._resolve_domain_success(JobUpdateSuccess(schema.name))
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(JobNameTaken(job_update.name))

    async def delete_job(self, job_id: int) -> None:
        job = await self.get_by_id(job_id)
        await self.delete_by_id(
            job_id,
            name=job.name,
            delete_error_exc=JobDeleteError,
            delete_success_exc=JobDeleteSuccess,
        )

    # ------------------------------------------------------------------
    # Group management
    # ------------------------------------------------------------------

    async def add_to_group(self, job_id: int, user_group_id: int) -> JobSchema:
        try:
            job = await self.repository.add_to_group(job_id, user_group_id)
            return JobSchema.model_validate(job)
        except DomainError as exc:
            raise await self._resolve_domain_error(exc)

    async def remove_from_group(self, job_id: int, user_group_id: int) -> JobSchema:
        try:
            job = await self.repository.remove_from_group(job_id, user_group_id)
            return JobSchema.model_validate(job)
        except DomainError as exc:
            raise await self._resolve_domain_error(exc)

    async def set_groups(self, job_id: int, user_group_ids: List[int]) -> JobSchema:
        try:
            job = await self.repository.set_groups(job_id, user_group_ids)
            return JobSchema.model_validate(job)
        except DomainError as exc:
            raise await self._resolve_domain_error(exc)

    # ------------------------------------------------------------------
    # Job-group sync
    # ------------------------------------------------------------------

    async def sync_job_users_groups(self, job_id: int) -> "SyncJobResult":
        user_service = EmployeeService(
            repository=EmployeeRepository(session=self.session),
            user=self.user,
            session=self.session,
        )
        return await user_service.sync_job_users_groups(job_id)
