from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.talent_audit_interview_job.talent_audit_interview_job_repository import (
    TalentAuditInterviewJobRepository,
)
from backend.api_v1.talent_audit_interview_job.talent_audit_interview_job_schema import (
    TalentAuditInterviewJob as TalentAuditInterviewJobSchema,
)
from backend.api_v1.talent_audit_interview_job.talent_audit_interview_job_service import (
    TalentAuditInterviewJobService,
)
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_talent_audit_interview_job_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> TalentAuditInterviewJobService:
    return TalentAuditInterviewJobService(
        repository=TalentAuditInterviewJobRepository(session=session),
        user=user,
        session=session,
    )


async def talent_audit_interview_job_by_id(
    talent_audit_interview_job_id: int,
    service: TalentAuditInterviewJobService = Depends(
        get_talent_audit_interview_job_service
    ),
) -> TalentAuditInterviewJobSchema:
    record = await service.get_by_id(talent_audit_interview_job_id)
    return TalentAuditInterviewJobSchema.model_validate(record)
