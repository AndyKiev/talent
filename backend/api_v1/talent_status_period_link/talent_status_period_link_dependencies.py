from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.talent_status_period_link.talent_status_period_link_schema import (
    TalentStatusPeriodLink as TalentStatusPeriodLinkSchema,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.database.db_helper import db_helper
from backend.api_v1.talent_status_period_link.talent_status_period_link_repository import (
    TalentStatusPeriodLinkRepository,
)
from backend.api_v1.talent_status_period_link.talent_status_period_link_service import (
    TalentStatusPeriodLinkService,
)
from backend.auth.jwt_auth import get_current_active_auth_user


async def get_talent_status_period_link_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> TalentStatusPeriodLinkService:
    return TalentStatusPeriodLinkService(
        repository=TalentStatusPeriodLinkRepository(session=session),
        user=user,
        session=session,
    )


async def talent_status_period_link_by_composite_key(
    talent_status_id: int,
    talent_period_id: int,
    service: TalentStatusPeriodLinkService = Depends(
        get_talent_status_period_link_service
    ),
) -> TalentStatusPeriodLinkSchema:
    record = await service.get_by_composite_key(
        talent_status_id=talent_status_id,
        talent_period_id=talent_period_id,
    )
    return TalentStatusPeriodLinkSchema.model_validate(record)


async def talent_status_period_link_by_id(
    talent_status_period_link_id: int,
    service: TalentStatusPeriodLinkService = Depends(
        get_talent_status_period_link_service
    ),
) -> TalentStatusPeriodLinkSchema:
    record = await service.get_by_id(talent_status_period_link_id)
    return TalentStatusPeriodLinkSchema.model_validate(record)
