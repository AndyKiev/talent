from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.review_session.review_session_repository import (
    ReviewSessionRepository,
)
from backend.api_v1.review_session.review_session_schema import (
    ReviewSession as ReviewSessionSchema,
)
from backend.api_v1.review_session.review_session_service import (
    ReviewSessionService,
)
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_review_session_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> ReviewSessionService:
    return ReviewSessionService(
        repository=ReviewSessionRepository(session=session),
        user=user,
        session=session,
    )


async def review_session_by_id(
    review_session_id: int,
    service: ReviewSessionService = Depends(get_review_session_service),
) -> ReviewSessionSchema:
    record = await service.get_by_id(review_session_id)
    return service._to_schema(record)
