from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.review_level.review_level_repository import ReviewLevelRepository
from backend.api_v1.review_level.review_level_schema import (
    ReviewLevel as ReviewLevelSchema,
)
from backend.api_v1.review_level.review_level_service import ReviewLevelService
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_review_level_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> ReviewLevelService:
    return ReviewLevelService(
        repository=ReviewLevelRepository(session=session),
        user=user,
        session=session,
    )


async def review_level_by_id(
    review_level_id: int,
    service: ReviewLevelService = Depends(get_review_level_service),
) -> ReviewLevelSchema:
    record = await service.get_by_id(review_level_id)
    return ReviewLevelSchema.model_validate(record)
