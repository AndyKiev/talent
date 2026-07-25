from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.interview.interview_repository import InterviewRepository
from backend.api_v1.interview.interview_service import InterviewService
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_interview_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> InterviewService:
    return InterviewService(
        repository=InterviewRepository(session=session),
        user=user,
        session=session,
    )
