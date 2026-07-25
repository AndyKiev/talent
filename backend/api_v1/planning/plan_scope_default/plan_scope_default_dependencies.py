from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.planning.plan_scope_default.plan_scope_default_repository import (
    PlanScopeDefaultRepository,
)
from backend.api_v1.planning.plan_scope_default.plan_scope_default_service import (
    PlanScopeDefaultService,
)
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_plan_scope_default_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> PlanScopeDefaultService:
    return PlanScopeDefaultService(
        repository=PlanScopeDefaultRepository(session=session),
        user=user,
        session=session,
    )
