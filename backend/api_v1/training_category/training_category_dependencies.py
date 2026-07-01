from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.training_category.training_category_schema import (
    TrainingCategory as TrainingCategorySchema,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.database.db_helper import db_helper
from backend.api_v1.training_category.training_category_repository import (
    TrainingCategoryRepository,
)
from backend.api_v1.training_category.training_category_service import (
    TrainingCategoryService,
)
from backend.auth.jwt_auth import get_current_active_auth_user


async def get_training_category_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> TrainingCategoryService:
    return TrainingCategoryService(
        repository=TrainingCategoryRepository(session=session),
        user=user,
        session=session,
    )


async def training_category_by_id(
    training_category_id: int,
    service: TrainingCategoryService = Depends(get_training_category_service),
) -> TrainingCategorySchema:
    record = await service.get_by_id(training_category_id)
    return TrainingCategorySchema.model_validate(record)
