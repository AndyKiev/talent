from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.database.db_helper import db_helper
from backend.api_v1.planning.plan_category_default.plan_category_default_repository import (
    PlanCategoryDefaultRepository,
)
from backend.api_v1.planning.plan_category_default.plan_category_default_service import (
    PlanCategoryDefaultService,
)
from backend.auth.jwt_auth import get_current_active_auth_user


async def get_plan_category_default_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> PlanCategoryDefaultService:
    return PlanCategoryDefaultService(
        repository=PlanCategoryDefaultRepository(session=session),
        user=user,
        session=session,
    )
