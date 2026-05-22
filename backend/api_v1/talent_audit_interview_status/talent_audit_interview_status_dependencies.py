from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.talent_audit_interview_status.talent_audit_interview_status_repository import (
    TalentAuditInterviewStatusRepository,
)
from backend.api_v1.talent_audit_interview_status.talent_audit_interview_status_schema import (
    TalentAuditInterviewStatus as TalentAuditInterviewStatusSchema,
)
from backend.api_v1.talent_audit_interview_status.talent_audit_interview_status_service import (
    TalentAuditInterviewStatusService,
)


async def get_talent_audit_interview_status_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> TalentAuditInterviewStatusService:
    return TalentAuditInterviewStatusService(
        repository=TalentAuditInterviewStatusRepository(session=session),
        user=user,
        session=session,
    )


async def talent_audit_interview_status_by_id(
    talent_audit_interview_status_id: int,
    service: TalentAuditInterviewStatusService = Depends(
        get_talent_audit_interview_status_service
    ),
) -> TalentAuditInterviewStatusSchema:
    record = await service.get_by_id(talent_audit_interview_status_id)
    return TalentAuditInterviewStatusSchema.model_validate(record)
