from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee_training_status.employee_training_status_schema import (
    EmployeeTrainingStatus as EmployeeTrainingStatusSchema,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.database.db_helper import db_helper
from backend.api_v1.employee_training_status.employee_training_status_repository import (
    EmployeeTrainingStatusRepository,
)
from backend.api_v1.employee_training_status.employee_training_status_service import (
    EmployeeTrainingStatusService,
)
from backend.auth.jwt_auth import get_current_active_auth_user


async def get_employee_training_status_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> EmployeeTrainingStatusService:
    return EmployeeTrainingStatusService(
        repository=EmployeeTrainingStatusRepository(session=session),
        user=user,
        session=session,
    )


async def employee_training_status_by_id(
    employee_training_status_id: int,
    service: EmployeeTrainingStatusService = Depends(get_employee_training_status_service),
) -> EmployeeTrainingStatusSchema:
    record = await service.get_by_id(employee_training_status_id)
    return EmployeeTrainingStatusSchema.model_validate(record)
