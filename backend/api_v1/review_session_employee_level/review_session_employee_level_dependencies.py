from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.database.db_helper import db_helper
from backend.api_v1.review_session_employee_level.review_session_employee_level_repository import (
    ReviewSessionEmployeeLevelRepository,
)
from backend.api_v1.review_session_employee_level.review_session_employee_level_service import (
    ReviewSessionEmployeeLevelService,
)
from backend.auth.jwt_auth import get_current_active_auth_user


async def get_review_session_employee_level_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> ReviewSessionEmployeeLevelService:
    return ReviewSessionEmployeeLevelService(
        repository=ReviewSessionEmployeeLevelRepository(session=session),
        user=user,
        session=session,
    )
