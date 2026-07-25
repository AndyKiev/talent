from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.employee_photo.employee_photo_repository import (
    EmployeePhotoRepository,
)
from backend.api_v1.employee_photo.employee_photo_service import EmployeePhotoService
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_employee_photo_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> EmployeePhotoService:
    return EmployeePhotoService(
        repository=EmployeePhotoRepository(session=session),
        user=user,
        session=session,
    )
