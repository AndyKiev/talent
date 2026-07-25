from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.talent_audit_status.talent_audit_status_repository import (
    TalentAuditStatusRepository,
)
from backend.api_v1.talent_audit_status.talent_audit_status_schema import (
    TalentAuditStatus as TalentAuditStatusSchema,
)
from backend.api_v1.talent_audit_status.talent_audit_status_service import (
    TalentAuditStatusService,
)
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_talent_audit_status_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> TalentAuditStatusService:
    return TalentAuditStatusService(
        repository=TalentAuditStatusRepository(session=session),
        user=user,
        session=session,
    )


async def talent_audit_status_by_id(
    talent_audit_status_id: int,
    service: TalentAuditStatusService = Depends(get_talent_audit_status_service),
) -> TalentAuditStatusSchema:
    record = await service.get_by_id(talent_audit_status_id)
    return TalentAuditStatusSchema.model_validate(record)
