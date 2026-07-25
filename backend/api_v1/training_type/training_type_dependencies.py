from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.training_type.training_type_repository import TrainingTypeRepository
from backend.api_v1.training_type.training_type_schema import (
    TrainingType as TrainingTypeSchema,
)
from backend.api_v1.training_type.training_type_service import TrainingTypeService
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession


async def get_training_type_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> TrainingTypeService:
    return TrainingTypeService(
        repository=TrainingTypeRepository(session=session),
        user=user,
        session=session,
    )


async def training_type_by_id(
    training_type_id: int,
    service: TrainingTypeService = Depends(get_training_type_service),
) -> TrainingTypeSchema:
    record = await service.get_by_id(training_type_id)
    return TrainingTypeSchema.model_validate(record)
