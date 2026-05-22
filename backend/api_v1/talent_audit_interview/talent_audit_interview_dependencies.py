from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.talent_audit_interview.talent_audit_interview_repository import (
    TalentAuditInterviewRepository,
)
from backend.api_v1.talent_audit_interview.talent_audit_interview_schema import (
    TalentAuditInterview as TalentAuditInterviewSchema,
)
from backend.api_v1.talent_audit_interview.talent_audit_interview_service import (
    TalentAuditInterviewService,
)


async def get_talent_audit_interview_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> TalentAuditInterviewService:
    return TalentAuditInterviewService(
        repository=TalentAuditInterviewRepository(session=session),
        user=user,
        session=session,
    )


async def talent_audit_interview_by_id(
    talent_audit_interview_id: int,
    service: TalentAuditInterviewService = Depends(get_talent_audit_interview_service),
) -> TalentAuditInterviewSchema:
    record = await service.get_by_id(talent_audit_interview_id)
    return TalentAuditInterviewSchema.model_validate(record)
