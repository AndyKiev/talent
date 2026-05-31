from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.review_dimension.review_dimension_schema import (
    ReviewDimension as ReviewDimensionSchema,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.database.db_helper import db_helper
from backend.api_v1.review_dimension.review_dimension_repository import (
    ReviewDimensionRepository,
)
from backend.api_v1.review_dimension.review_dimension_service import (
    ReviewDimensionService,
)
from backend.auth.jwt_auth import get_current_active_auth_user


async def get_review_dimension_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> ReviewDimensionService:
    return ReviewDimensionService(
        repository=ReviewDimensionRepository(session=session),
        user=user,
        session=session,
    )


async def review_dimension_by_id(
    review_dimension_id: int,
    service: ReviewDimensionService = Depends(get_review_dimension_service),
) -> ReviewDimensionSchema:
    record = await service.get_by_id(review_dimension_id)
    return ReviewDimensionSchema.model_validate(record)
