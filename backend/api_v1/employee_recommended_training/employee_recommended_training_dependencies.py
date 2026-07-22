from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_recommended_training.employee_recommended_training_repository import (
    EmployeeRecommendedTrainingRepository,
)
from backend.api_v1.employee_recommended_training.employee_recommended_training_service import (
    EmployeeRecommendedTrainingService,
)
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_employee_recommended_training_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    current_user: EmployeeSchema = Depends(get_current_active_auth_user),
) -> EmployeeRecommendedTrainingService:
    return EmployeeRecommendedTrainingService(
        repository=EmployeeRecommendedTrainingRepository(session=session),
        user=current_user,
        session=session,
    )
