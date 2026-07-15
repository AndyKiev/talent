from typing import List, Optional

from fastapi import status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.app_setting.app_setting_service import (
    get_bool_setting,
    TRAINING_MODULE_ENABLED_KEY,
)
from backend.api_v1.training_type.training_type_model import TrainingType
from backend.api_v1.training_type_job_link.training_type_job_link_repository import (
    TrainingTypeJobLinkRepository,
)
from backend.api_v1.training_type_job_link.training_type_job_link_schema import (
    TrainingTypeJobLink as TrainingTypeJobLinkSchema,
    TrainingTypeJobLinkBulkSet,
    TrainingTypeJobLinkBulkSetForJob,
)
from backend.api_v1.training_type_job_link.training_type_job_link_messages import (
    TrainingTypeNotFoundForJobLink,
    JobsNotFoundForTrainingTypeLink,
    JobNotFoundForTrainingTypeLink,
    TrainingTypesNotFoundForJobLink,
)
from backend.api_v1.training_type_job_link.training_type_job_link_messages import (
    TrainingTypeJobLinkSetSuccess,
    TrainingTypeJobLinkSetForJobSuccess,
)
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.job.job_model import Job


class TrainingTypeJobLinkService(BaseService):
    def __init__(
        self,
        repository: TrainingTypeJobLinkRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    def _to_schema(self, link) -> TrainingTypeJobLinkSchema:
        schema = TrainingTypeJobLinkSchema.model_validate(link)
        if link.job:
            schema.job_name = link.job.name
        if link.training_type:
            schema.training_type_name = link.training_type.name
        return schema

    async def _get_training_type_or_raise(self, training_type_id: int) -> TrainingType:
        record = await self.session.scalar(
            select(TrainingType).where(TrainingType.id == training_type_id)
        )
        if not record:
            raise await self._resolve_domain_error(
                TrainingTypeNotFoundForJobLink(training_type_id)
            )
        return record

    async def _get_job_or_raise(self, job_id: int) -> Job:
        job = await self.session.scalar(select(Job).where(Job.id == job_id))
        if not job:
            raise await self._resolve_domain_error(
                JobNotFoundForTrainingTypeLink(job_id)
            )
        return job

    async def get_links_for_training_type(
        self, training_type_id: int
    ) -> List[TrainingTypeJobLinkSchema]:
        links = await self.repository.get_links_for_training_type(training_type_id)
        return [self._to_schema(lnk) for lnk in links]

    async def get_links_for_job(self, job_id: int) -> List[TrainingTypeJobLinkSchema]:
        links = await self.repository.get_links_for_job(job_id)
        return [self._to_schema(lnk) for lnk in links]

    async def set_links(
        self, training_type_id: int, payload: TrainingTypeJobLinkBulkSet
    ) -> MutationResponse[List[TrainingTypeJobLinkSchema]]:
        if not await get_bool_setting(
            self.session, TRAINING_MODULE_ENABLED_KEY, default=False
        ):
            await self._raise_error(
                "trainingModuleDisabled",
                status_code=status.HTTP_403_FORBIDDEN,
                fallback="Training module is disabled.",
            )
        training_type = await self._get_training_type_or_raise(training_type_id)

        jobs = await self.repository.get_jobs_by_ids(payload.job_ids)
        found_ids = {j.id for j in jobs}
        missing = set(payload.job_ids) - found_ids
        if missing:
            raise await self._resolve_domain_error(
                JobsNotFoundForTrainingTypeLink(missing)
            )

        await self.repository.delete_links_for_training_type(training_type_id)
        new_links = [
            self.repository.model(training_type_id=training_type_id, job_id=jid)
            for jid in payload.job_ids
        ]
        if new_links:
            await self.repository.mass_create(new_links)

        links = await self.repository.get_links_for_training_type(training_type_id)
        schemas = [self._to_schema(lnk) for lnk in links]
        detail = await self._resolve_domain_success(
            TrainingTypeJobLinkSetSuccess(training_type.name, len(schemas))
        )
        return MutationResponse(detail=detail, data=schemas)

    async def set_links_for_job(
        self, job_id: int, payload: TrainingTypeJobLinkBulkSetForJob
    ) -> MutationResponse[List[TrainingTypeJobLinkSchema]]:
        """Reverse side of set_links: replace all training types recommending a job."""
        if not await get_bool_setting(
            self.session, TRAINING_MODULE_ENABLED_KEY, default=False
        ):
            await self._raise_error(
                "trainingModuleDisabled",
                status_code=status.HTTP_403_FORBIDDEN,
                fallback="Training module is disabled.",
            )
        job = await self._get_job_or_raise(job_id)

        training_types = await self.repository.get_training_types_by_ids(
            payload.training_type_ids
        )
        found_ids = {t.id for t in training_types}
        missing = set(payload.training_type_ids) - found_ids
        if missing:
            raise await self._resolve_domain_error(
                TrainingTypesNotFoundForJobLink(missing)
            )

        await self.repository.delete_links_for_job(job_id)
        new_links = [
            self.repository.model(training_type_id=tid, job_id=job_id)
            for tid in payload.training_type_ids
        ]
        if new_links:
            await self.repository.mass_create(new_links)

        links = await self.repository.get_links_for_job(job_id)
        schemas = [self._to_schema(lnk) for lnk in links]
        detail = await self._resolve_domain_success(
            TrainingTypeJobLinkSetForJobSuccess(job.name, len(schemas))
        )
        return MutationResponse(detail=detail, data=schemas)
