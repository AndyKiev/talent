# backend/api_v1/planning/plan_matrix/plan_matrix_dependencies.py
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.planning.plan_matrix.plan_matrix_repository import (
    PlanMatrixRepository,
)
from backend.api_v1.planning.plan_matrix.plan_matrix_service import (
    PlanMatrixService,
)
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_plan_matrix_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> PlanMatrixService:
    return PlanMatrixService(
        repository=PlanMatrixRepository(session=session),
        user=user,
        session=session,
    )
