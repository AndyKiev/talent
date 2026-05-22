from typing import List, Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.talent_audit_job.talent_audit_job_errors import (
    TalentAuditJobDeleteError,
    TalentAuditJobNotFound,
)
from backend.api_v1.talent_audit_job.talent_audit_job_repository import TalentAuditJobRepository
from backend.api_v1.talent_audit_job.talent_audit_job_schema import (
    TalentAuditJob as TalentAuditJobSchema,
    TalentAuditJobCreate,
    TalentAuditJobUpdate,
)
from backend.api_v1.talent_audit_job.talent_audit_job_success import (
    TalentAuditJobCreateSuccess,
    TalentAuditJobDeleteSuccess,
    TalentAuditJobUpdateSuccess,
)


class TalentAuditJobService(BaseService):
    def __init__(
        self,
        repository: TalentAuditJobRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    async def get_by_id(self, job_id: int) -> TalentAuditJobSchema:
        record = await self.repository.get_by_id(job_id)
        if not record:
            raise await self._resolve_domain_error(TalentAuditJobNotFound(job_id))
        return record

    async def get_by_talent_audit_id(self, talent_audit_id: int) -> List[TalentAuditJobSchema]:
        records = await self.repository.get_by_talent_audit_id(talent_audit_id)
        return [TalentAuditJobSchema.model_validate(r) for r in records]

    async def get_talent_audit_jobs(
        self, sort: Optional[str] = None
    ) -> List[TalentAuditJobSchema]:
        records = await self.get_all(sort_json=sort)
        return [TalentAuditJobSchema.model_validate(r) for r in records]

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    async def create_talent_audit_job(
        self, job_in: TalentAuditJobCreate
    ) -> MutationResponse[TalentAuditJobSchema]:
        try:
            user_id = self.user.id if self.user else job_in.talent_audit_id
            instance = self.repository.model(
                **job_in.model_dump(),
                created_by=user_id,
            )
            record = await self.repository.create(instance)
            schema = TalentAuditJobSchema.model_validate(record)
            detail = await self._resolve_domain_success(
                TalentAuditJobCreateSuccess(schema.id)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(TalentAuditJobNotFound(job_in.talent_audit_id))

    async def update_talent_audit_job(
        self, job_id: int, job_update: TalentAuditJobUpdate
    ) -> MutationResponse[TalentAuditJobSchema]:
        orm_record = await self.get_by_id(job_id)
        update_data = job_update.model_dump(exclude_unset=True)
        updated = await self.repository.update(
            instance=orm_record,
            instance_update=update_data,
        )
        schema = TalentAuditJobSchema.model_validate(updated)
        detail = await self._resolve_domain_success(
            TalentAuditJobUpdateSuccess(schema.id)
        )
        return MutationResponse(detail=detail, data=schema)

    async def delete_talent_audit_job(self, job_id: int) -> None:
        await self.get_by_id(job_id)
        await self.delete_by_id(
            job_id,
            name=str(job_id),
            delete_error_exc=TalentAuditJobDeleteError,
            delete_success_exc=TalentAuditJobDeleteSuccess,
        )
