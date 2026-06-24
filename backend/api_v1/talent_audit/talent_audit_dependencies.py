from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession


from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.talent_audit.talent_audit_repository import TalentAuditRepository
from backend.api_v1.talent_audit.talent_audit_schema import (
    TalentAudit as TalentAuditSchema,
)
from backend.api_v1.talent_audit.talent_audit_service import TalentAuditService


async def get_talent_audit_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> TalentAuditService:
    return TalentAuditService(
        repository=TalentAuditRepository(session=session),
        user=user,
        session=session,
    )


async def talent_audit_by_id(
    talent_audit_id: int,
    service: TalentAuditService = Depends(get_talent_audit_service),
) -> TalentAuditSchema:
    record = await service.get_by_id(talent_audit_id)
    return TalentAuditSchema.model_validate(record)
