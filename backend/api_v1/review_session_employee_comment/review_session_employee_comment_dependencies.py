from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.database.db_helper import db_helper
from backend.api_v1.review_session_employee_comment.review_session_employee_comment_repository import (
    ReviewSessionEmployeeCommentRepository,
)
from backend.api_v1.review_session_employee_comment.review_session_employee_comment_service import (
    ReviewSessionEmployeeCommentService,
)
from backend.auth.jwt_auth import get_current_active_auth_user


async def get_review_session_employee_comment_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> ReviewSessionEmployeeCommentService:
    return ReviewSessionEmployeeCommentService(
        repository=ReviewSessionEmployeeCommentRepository(session=session),
        user=user,
        session=session,
    )
