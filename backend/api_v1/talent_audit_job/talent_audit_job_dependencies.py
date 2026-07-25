from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.talent_audit_job.talent_audit_job_repository import (
    TalentAuditJobRepository,
)
from backend.api_v1.talent_audit_job.talent_audit_job_schema import (
    TalentAuditJob as TalentAuditJobSchema,
)
from backend.api_v1.talent_audit_job.talent_audit_job_service import (
    TalentAuditJobService,
)
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_talent_audit_job_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> TalentAuditJobService:
    return TalentAuditJobService(
        repository=TalentAuditJobRepository(session=session),
        user=user,
        session=session,
    )


async def talent_audit_job_by_id(
    talent_audit_job_id: int,
    service: TalentAuditJobService = Depends(get_talent_audit_job_service),
) -> TalentAuditJobSchema:
    record = await service.get_by_id(talent_audit_job_id)
    return TalentAuditJobSchema.model_validate(record)
