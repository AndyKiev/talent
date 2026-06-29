from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.review_session_status.review_session_status_schema import (
    ReviewSessionStatus as ReviewSessionStatusSchema,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.database.db_helper import db_helper
from backend.api_v1.review_session_status.review_session_status_repository import (
    ReviewSessionStatusRepository,
)
from backend.api_v1.review_session_status.review_session_status_service import (
    ReviewSessionStatusService,
)
from backend.auth.jwt_auth import get_current_active_auth_user


async def get_review_session_status_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> ReviewSessionStatusService:
    return ReviewSessionStatusService(
        repository=ReviewSessionStatusRepository(session=session),
        user=user,
        session=session,
    )


async def review_session_status_by_id(
    review_session_status_id: int,
    service: ReviewSessionStatusService = Depends(get_review_session_status_service),
) -> ReviewSessionStatusSchema:
    record = await service.get_by_id(review_session_status_id)
    return ReviewSessionStatusSchema.model_validate(record)
