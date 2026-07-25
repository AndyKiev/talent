from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.planning.plan_scope.plan_scope_repository import PlanScopeRepository
from backend.api_v1.planning.plan_scope.plan_scope_schema import (
    PlanScope as PlanScopeSchema,
)
from backend.api_v1.planning.plan_scope.plan_scope_service import PlanScopeService
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_plan_scope_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> PlanScopeService:
    return PlanScopeService(
        repository=PlanScopeRepository(session=session),
        user=user,
        session=session,
    )


async def plan_scope_by_id(
    plan_scope_id: int,
    service: PlanScopeService = Depends(get_plan_scope_service),
) -> PlanScopeSchema:
    record = await service.get_by_id(plan_scope_id)
    return PlanScopeSchema.model_validate(record)
