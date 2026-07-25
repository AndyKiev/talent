from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.interview_feedback.interview_feedback_repository import (
    InterviewFeedbackRepository,
)
from backend.api_v1.interview_feedback.interview_feedback_service import (
    InterviewFeedbackService,
)
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_interview_feedback_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> InterviewFeedbackService:
    return InterviewFeedbackService(
        repository=InterviewFeedbackRepository(session=session),
        user=user,
        session=session,
    )
