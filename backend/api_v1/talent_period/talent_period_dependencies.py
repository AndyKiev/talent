from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.talent_period.talent_period_schema import TalentPeriod as TalentPeriodSchema
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.database.db_helper import db_helper
from backend.api_v1.talent_period.talent_period_repository import TalentPeriodRepository
from backend.api_v1.talent_period.talent_period_service import TalentPeriodService
from backend.auth.jwt_auth import get_current_active_auth_user


async def get_talent_period_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> TalentPeriodService:
    return TalentPeriodService(
        repository=TalentPeriodRepository(session=session),
        user=user,
        session=session,
    )


async def talent_period_by_id(
    talent_period_id: int,
    service: TalentPeriodService = Depends(get_talent_period_service),
) -> TalentPeriodSchema:
    record = await service.get_by_id(talent_period_id)
    return TalentPeriodSchema.model_validate(record)
