from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.review_level_requirement.review_level_requirement_schema import (
    ReviewLevelRequirement as ReviewLevelRequirementSchema,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.database.db_helper import db_helper
from backend.api_v1.review_level_requirement.review_level_requirement_repository import (
    ReviewLevelRequirementRepository,
)
from backend.api_v1.review_level_requirement.review_level_requirement_service import (
    ReviewLevelRequirementService,
)
from backend.auth.jwt_auth import get_current_active_auth_user


async def get_review_level_requirement_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> ReviewLevelRequirementService:
    return ReviewLevelRequirementService(
        repository=ReviewLevelRequirementRepository(session=session),
        user=user,
        session=session,
    )


async def review_level_requirement_by_id(
    requirement_id: int,
    service: ReviewLevelRequirementService = Depends(
        get_review_level_requirement_service
    ),
) -> ReviewLevelRequirementSchema:
    record = await service.get_by_id(requirement_id)
    return ReviewLevelRequirementSchema.model_validate(record)
