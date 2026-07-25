from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.review_session_employee.review_session_employee_repository import (
    ReviewSessionEmployeeRepository,
)
from backend.api_v1.review_session_employee.review_session_employee_service import (
    ReviewSessionEmployeeService,
)
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_review_session_employee_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> ReviewSessionEmployeeService:
    return ReviewSessionEmployeeService(
        repository=ReviewSessionEmployeeRepository(session=session),
        user=user,
        session=session,
    )
