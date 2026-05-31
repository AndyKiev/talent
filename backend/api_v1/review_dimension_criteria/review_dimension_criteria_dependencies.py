from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.review_dimension_criteria.review_dimension_criteria_schema import (
    ReviewDimensionCriteria as ReviewDimensionCriteriaSchema,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.database.db_helper import db_helper
from backend.api_v1.review_dimension_criteria.review_dimension_criteria_repository import (
    ReviewDimensionCriteriaRepository,
)
from backend.api_v1.review_dimension_criteria.review_dimension_criteria_service import (
    ReviewDimensionCriteriaService,
)
from backend.auth.jwt_auth import get_current_active_auth_user


async def get_review_dimension_criteria_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> ReviewDimensionCriteriaService:
    return ReviewDimensionCriteriaService(
        repository=ReviewDimensionCriteriaRepository(session=session),
        user=user,
        session=session,
    )


async def review_dimension_criteria_by_id(
    criteria_id: int,
    service: ReviewDimensionCriteriaService = Depends(
        get_review_dimension_criteria_service
    ),
) -> ReviewDimensionCriteriaSchema:
    record = await service.get_by_id(criteria_id)
    return ReviewDimensionCriteriaSchema.model_validate(record)
