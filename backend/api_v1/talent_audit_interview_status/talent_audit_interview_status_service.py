from typing import List, Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.talent_audit_interview_status.talent_audit_interview_status_messages import (
    TalentAuditInterviewStatusDeleteError,
    TalentAuditInterviewStatusNameTaken,
    TalentAuditInterviewStatusNotFound,
    TalentAuditInterviewStatusNotFoundByName,
)
from backend.api_v1.talent_audit_interview_status.talent_audit_interview_status_repository import (
    TalentAuditInterviewStatusRepository,
)
from backend.api_v1.talent_audit_interview_status.talent_audit_interview_status_schema import (
    TalentAuditInterviewStatus as TalentAuditInterviewStatusSchema,
    TalentAuditInterviewStatusCreate,
    TalentAuditInterviewStatusUpdate,
)
from backend.api_v1.talent_audit_interview_status.talent_audit_interview_status_messages import (
    TalentAuditInterviewStatusCreateSuccess,
    TalentAuditInterviewStatusDeleteSuccess,
    TalentAuditInterviewStatusUpdateSuccess,
)


class TalentAuditInterviewStatusService(BaseService):
    def __init__(
        self,
        repository: TalentAuditInterviewStatusRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, status_id: int) -> TalentAuditInterviewStatusSchema:
        result = await self.repository.get_by_id(status_id)
        if not result:
            raise await self._resolve_domain_error(
                TalentAuditInterviewStatusNotFound(status_id)
            )
        return result

    async def get_talent_audit_interview_statuses(
        self,
        name: Optional[str] = None,
        sort: Optional[str] = None,
    ) -> List[TalentAuditInterviewStatusSchema]:
        if name:
            record = await self.get_by_name(
                name, not_found_exc=TalentAuditInterviewStatusNotFoundByName
            )
            return [TalentAuditInterviewStatusSchema.model_validate(record)]
        records = await self.get_all(sort_json=sort)
        return [TalentAuditInterviewStatusSchema.model_validate(r) for r in records]

    async def create_talent_audit_interview_status(
        self, status_in: TalentAuditInterviewStatusCreate
    ) -> MutationResponse[TalentAuditInterviewStatusSchema]:
        await self.exists_by_name(
            status_in.name, already_exists_exc=TalentAuditInterviewStatusNameTaken
        )
        try:
            record = await self.create(status_in)
            schema = TalentAuditInterviewStatusSchema.model_validate(record)
            detail = await self._resolve_domain_success(
                TalentAuditInterviewStatusCreateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                TalentAuditInterviewStatusNameTaken(status_in.name)
            )

    async def update_talent_audit_interview_status(
        self, status_id: int, status_update: TalentAuditInterviewStatusUpdate
    ) -> MutationResponse[TalentAuditInterviewStatusSchema]:
        if status_update.name:
            await self.exists_by_name(
                status_update.name,
                already_exists_exc=TalentAuditInterviewStatusNameTaken,
            )
        try:
            orm_record = await self.get_by_id(status_id)
            updated = await self.update(orm_record, status_update, partial=True)
            schema = TalentAuditInterviewStatusSchema.model_validate(updated)
            detail = await self._resolve_domain_success(
                TalentAuditInterviewStatusUpdateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                TalentAuditInterviewStatusNameTaken(status_update.name)
            )

    async def delete_talent_audit_interview_status(self, status_id: int) -> None:
        record = await self.get_by_id(status_id)
        await self.delete_by_id(
            status_id,
            name=record.name,
            delete_error_exc=TalentAuditInterviewStatusDeleteError,
            delete_success_exc=TalentAuditInterviewStatusDeleteSuccess,
        )
