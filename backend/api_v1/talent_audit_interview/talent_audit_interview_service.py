from typing import List, Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.talent_audit_interview.talent_audit_interview_errors import (
    TalentAuditInterviewDeleteError,
    TalentAuditInterviewNotFound,
)
from backend.api_v1.talent_audit_interview.talent_audit_interview_repository import (
    TalentAuditInterviewRepository,
)
from backend.api_v1.talent_audit_interview.talent_audit_interview_schema import (
    TalentAuditInterview as TalentAuditInterviewSchema,
    TalentAuditInterviewCreate,
    TalentAuditInterviewUpdate,
)
from backend.api_v1.talent_audit_interview.talent_audit_interview_success import (
    TalentAuditInterviewCreateSuccess,
    TalentAuditInterviewDeleteSuccess,
    TalentAuditInterviewUpdateSuccess,
)


class TalentAuditInterviewService(BaseService):
    def __init__(
        self,
        repository: TalentAuditInterviewRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    async def get_by_id(self, interview_id: int) -> TalentAuditInterviewSchema:
        record = await self.repository.get_by_id(interview_id)
        if not record:
            raise await self._resolve_domain_error(TalentAuditInterviewNotFound(interview_id))
        return record

    async def get_by_talent_audit_job_id(
        self, talent_audit_job_id: int
    ) -> List[TalentAuditInterviewSchema]:
        records = await self.repository.get_by_talent_audit_job_id(talent_audit_job_id)
        return [TalentAuditInterviewSchema.model_validate(r) for r in records]

    async def get_talent_audit_interviews(
        self, sort: Optional[str] = None
    ) -> List[TalentAuditInterviewSchema]:
        records = await self.get_all(sort_json=sort)
        return [TalentAuditInterviewSchema.model_validate(r) for r in records]

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    async def create_talent_audit_interview(
        self, interview_in: TalentAuditInterviewCreate
    ) -> MutationResponse[TalentAuditInterviewSchema]:
        try:
            user_id = self.user.id if self.user else interview_in.talent_audit_job_id
            instance = self.repository.model(
                **interview_in.model_dump(),
                created_by=user_id,
            )
            record = await self.repository.create(instance)
            schema = TalentAuditInterviewSchema.model_validate(record)
            detail = await self._resolve_domain_success(
                TalentAuditInterviewCreateSuccess(schema.id)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                TalentAuditInterviewNotFound(interview_in.talent_audit_job_id)
            )

    async def update_talent_audit_interview(
        self, interview_id: int, interview_update: TalentAuditInterviewUpdate
    ) -> MutationResponse[TalentAuditInterviewSchema]:
        orm_record = await self.get_by_id(interview_id)
        update_data = interview_update.model_dump(exclude_unset=True)
        updated = await self.repository.update(
            instance=orm_record,
            instance_update=update_data,
        )
        schema = TalentAuditInterviewSchema.model_validate(updated)
        detail = await self._resolve_domain_success(
            TalentAuditInterviewUpdateSuccess(schema.id)
        )
        return MutationResponse(detail=detail, data=schema)

    async def delete_talent_audit_interview(self, interview_id: int) -> None:
        await self.get_by_id(interview_id)
        await self.delete_by_id(
            interview_id,
            name=str(interview_id),
            delete_error_exc=TalentAuditInterviewDeleteError,
            delete_success_exc=TalentAuditInterviewDeleteSuccess,
        )
