from typing import List, Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.talent_audit_job_status.talent_audit_job_status_messages import (
    TalentAuditJobStatusDeleteError,
    TalentAuditJobStatusNameTaken,
    TalentAuditJobStatusNotFound,
    TalentAuditJobStatusNotFoundByName,
)
from backend.api_v1.talent_audit_job_status.talent_audit_job_status_repository import (
    TalentAuditJobStatusRepository,
)
from backend.api_v1.talent_audit_job_status.talent_audit_job_status_schema import (
    TalentAuditJobStatus as TalentAuditJobStatusSchema,
    TalentAuditJobStatusCreate,
    TalentAuditJobStatusUpdate,
)
from backend.api_v1.talent_audit_job_status.talent_audit_job_status_messages import (
    TalentAuditJobStatusCreateSuccess,
    TalentAuditJobStatusDeleteSuccess,
    TalentAuditJobStatusUpdateSuccess,
)


class TalentAuditJobStatusService(BaseService):
    def __init__(
        self,
        repository: TalentAuditJobStatusRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, status_id: int) -> TalentAuditJobStatusSchema:
        result = await self.repository.get_by_id(status_id)
        if not result:
            raise await self._resolve_domain_error(
                TalentAuditJobStatusNotFound(status_id)
            )
        return result

    async def get_talent_audit_job_statuses(
        self,
        name: Optional[str] = None,
        sort: Optional[str] = None,
    ) -> List[TalentAuditJobStatusSchema]:
        if name:
            record = await self.get_by_name(
                name, not_found_exc=TalentAuditJobStatusNotFoundByName
            )
            return [TalentAuditJobStatusSchema.model_validate(record)]
        records = await self.get_all(sort_json=sort)
        return [TalentAuditJobStatusSchema.model_validate(r) for r in records]

    async def create_talent_audit_job_status(
        self, status_in: TalentAuditJobStatusCreate
    ) -> MutationResponse[TalentAuditJobStatusSchema]:
        await self.exists_by_name(
            status_in.name, already_exists_exc=TalentAuditJobStatusNameTaken
        )
        try:
            record = await self.create(status_in)
            schema = TalentAuditJobStatusSchema.model_validate(record)
            detail = await self._resolve_domain_success(
                TalentAuditJobStatusCreateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                TalentAuditJobStatusNameTaken(status_in.name)
            )

    async def update_talent_audit_job_status(
        self, status_id: int, status_update: TalentAuditJobStatusUpdate
    ) -> MutationResponse[TalentAuditJobStatusSchema]:
        if status_update.name:
            await self.exists_by_name(
                status_update.name, already_exists_exc=TalentAuditJobStatusNameTaken
            )
        try:
            orm_record = await self.get_by_id(status_id)
            updated = await self.update(orm_record, status_update, partial=True)
            schema = TalentAuditJobStatusSchema.model_validate(updated)
            detail = await self._resolve_domain_success(
                TalentAuditJobStatusUpdateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                TalentAuditJobStatusNameTaken(status_update.name)
            )

    async def delete_talent_audit_job_status(self, status_id: int) -> None:
        record = await self.get_by_id(status_id)
        await self.delete_by_id(
            status_id,
            name=record.name,
            delete_error_exc=TalentAuditJobStatusDeleteError,
            delete_success_exc=TalentAuditJobStatusDeleteSuccess,
        )
