from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.recruitment_interview_feedback.recruitment_interview_feedback_repository import (
    RecruitmentInterviewFeedbackRepository,
)
from backend.api_v1.recruitment_interview_feedback.recruitment_interview_feedback_service import (
    RecruitmentInterviewFeedbackService,
)
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_interview_feedback_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> RecruitmentInterviewFeedbackService:
    return RecruitmentInterviewFeedbackService(
        repository=RecruitmentInterviewFeedbackRepository(session=session),
        user=user,
        session=session,
    )
