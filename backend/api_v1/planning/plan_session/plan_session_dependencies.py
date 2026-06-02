from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.planning.plan_session.plan_session_schema import (
    PlanSession as PlanSessionSchema,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.database.db_helper import db_helper
from backend.api_v1.planning.plan_session.plan_session_repository import (
    PlanSessionRepository,
)
from backend.api_v1.planning.plan_session.plan_session_service import PlanSessionService
from backend.auth.jwt_auth import get_current_active_auth_user


async def get_plan_session_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> PlanSessionService:
    return PlanSessionService(
        repository=PlanSessionRepository(session=session),
        user=user,
        session=session,
    )


async def plan_session_by_id(
    plan_session_id: int,
    service: PlanSessionService = Depends(get_plan_session_service),
) -> PlanSessionSchema:
    record = await service.get_by_id(plan_session_id)
    return PlanSessionSchema.model_validate(record)
