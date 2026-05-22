from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.talent_status.talent_status_schema import TalentStatus as TalentStatusSchema
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.database.db_helper import db_helper
from backend.api_v1.talent_status.talent_status_repository import TalentStatusRepository
from backend.api_v1.talent_status.talent_status_service import TalentStatusService
from backend.auth.jwt_auth import get_current_active_auth_user


async def get_talent_status_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> TalentStatusService:
    return TalentStatusService(
        repository=TalentStatusRepository(session=session),
        user=user,
        session=session,
    )


async def talent_status_by_id(
    talent_status_id: int,
    service: TalentStatusService = Depends(get_talent_status_service),
) -> TalentStatusSchema:
    record = await service.get_by_id(talent_status_id)
    return TalentStatusSchema.model_validate(record)
