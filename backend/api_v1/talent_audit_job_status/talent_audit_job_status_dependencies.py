from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.talent_audit_job_status.talent_audit_job_status_repository import (
    TalentAuditJobStatusRepository,
)
from backend.api_v1.talent_audit_job_status.talent_audit_job_status_schema import (
    TalentAuditJobStatus as TalentAuditJobStatusSchema,
)
from backend.api_v1.talent_audit_job_status.talent_audit_job_status_service import (
    TalentAuditJobStatusService,
)
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_talent_audit_job_status_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> TalentAuditJobStatusService:
    return TalentAuditJobStatusService(
        repository=TalentAuditJobStatusRepository(session=session),
        user=user,
        session=session,
    )


async def talent_audit_job_status_by_id(
    talent_audit_job_status_id: int,
    service: TalentAuditJobStatusService = Depends(get_talent_audit_job_status_service),
) -> TalentAuditJobStatusSchema:
    record = await service.get_by_id(talent_audit_job_status_id)
    return TalentAuditJobStatusSchema.model_validate(record)
