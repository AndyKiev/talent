from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.review_session_employee_evaluation.review_session_employee_evaluation_repository import (
    ReviewSessionEmployeeEvaluationRepository,
)
from backend.api_v1.review_session_employee_evaluation.review_session_employee_evaluation_service import (
    ReviewSessionEmployeeEvaluationService,
)
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_evaluation_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> ReviewSessionEmployeeEvaluationService:
    return ReviewSessionEmployeeEvaluationService(
        repository=ReviewSessionEmployeeEvaluationRepository(session=session),
        user=user,
        session=session,
    )
