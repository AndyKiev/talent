from typing import List, Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.job.job_repository import JobRepository
from backend.api_v1.job.job_schema import Job as JobSchema, JobCreate, JobUpdate
from backend.api_v1.user.user_schema import User as UserSchema
from backend.api_v1.job.job_errors import (
    JobNotFound,
    JobNameTaken,
    JobDeleteError,
    JobDeleteSuccess,
    JobNotFoundByName,
)
from backend.api_v1.user.user_repository import UserRepository
from backend.api_v1.user.user_service import UserService, SyncJobResult
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
            # job = await self.get_by_name(name)
            return [JobSchema.model_validate(job)]
        jobs = await self.get_all(sort_json=sort)
        return [JobSchema.model_validate(j) for j in jobs]

    async def create_job(self, job_in: JobCreate) -> JobSchema:
        await self.exists_by_name(job_in.name, already_exists_exc=JobNameTaken)
        try:
            job = await self.create(job_in)
            return JobSchema.model_validate(job)
        except IntegrityError:
            raise await self._resolve_domain_error(JobNameTaken(job_in.name))

    async def update_job(self, job_id: int, job_update: JobUpdate) -> JobSchema:
        if job_update.name:
            await self.exists_by_name(job_update.name, already_exists_exc=JobNameTaken)
        try:
            orm_job = await self.get_by_id(job_id)
            updated = await self.update(orm_job, job_update, partial=True)
            return JobSchema.model_validate(updated)
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
    # Job-group sync  (doll #2)
    # ------------------------------------------------------------------

    async def sync_job_users_groups(self, job_id: int) -> "SyncJobResult":
        """
        Delegate to UserService so all sync logic lives in one place.
        JobService only owns job-level concerns; the user loop belongs to
        UserService which owns the UserRepository.
        """

        user_service = UserService(
            repository=UserRepository(session=self.session),
            user=self.user,
            session=self.session,
        )
        return await user_service.sync_job_users_groups(job_id)

    #
    # async def delete_job(self, job_id: int) -> None:
    #     job = await self.get_by_id(job_id)  # raises JobNotFound if missing
    #     try:
    #         await self.delete_by_id(job_id)
    #     except IntegrityError:
    #         exc = JobDeleteError(job.name)
    #         raise await self._resolve_domain_error(exc)
    #
    #     await self._raise_success(
    #         message_key="jobDeleteSuccess",
    #         variables={"name": job.name},
    #         fallback=f"Job '{job.name}' successfully deleted",
    #     )
