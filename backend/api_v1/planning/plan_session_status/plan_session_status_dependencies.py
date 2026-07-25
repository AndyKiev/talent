from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.planning.plan_session_status.plan_session_status_repository import (
    PlanSessionStatusRepository,
)
from backend.api_v1.planning.plan_session_status.plan_session_status_schema import (
    PlanSessionStatus as PlanSessionStatusSchema,
)
from backend.api_v1.planning.plan_session_status.plan_session_status_service import (
    PlanSessionStatusService,
)
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_plan_session_status_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> PlanSessionStatusService:
    return PlanSessionStatusService(
        repository=PlanSessionStatusRepository(session=session),
        user=user,
        session=session,
    )


async def plan_session_status_by_id(
    plan_session_status_id: int,
    service: PlanSessionStatusService = Depends(get_plan_session_status_service),
) -> PlanSessionStatusSchema:
    record = await service.get_by_id(plan_session_status_id)
    return PlanSessionStatusSchema.model_validate(record)
