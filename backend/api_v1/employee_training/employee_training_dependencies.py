from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee_training.employee_training_model import (
    EmployeeTraining as EmployeeTrainingModel,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.database.db_helper import db_helper
from backend.api_v1.employee_training.employee_training_repository import (
    EmployeeTrainingRepository,
)
from backend.api_v1.employee_training.employee_training_service import (
    EmployeeTrainingService,
)
from backend.auth.jwt_auth import get_current_active_auth_user


async def get_employee_training_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> EmployeeTrainingService:
    return EmployeeTrainingService(
        repository=EmployeeTrainingRepository(session=session),
        user=user,
        session=session,
    )


async def employee_training_by_id(
    employee_training_id: int,
    service: EmployeeTrainingService = Depends(get_employee_training_service),
) -> EmployeeTrainingModel:
    return await service.get_by_id(employee_training_id)
