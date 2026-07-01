from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.database.db_helper import db_helper
from backend.api_v1.user_setting.user_setting_repository import UserSettingRepository
from backend.api_v1.user_setting.user_setting_service import UserSettingService
from backend.auth.jwt_auth import get_current_active_auth_user


async def get_user_setting_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> UserSettingService:
    return UserSettingService(
        repository=UserSettingRepository(session=session),
        user=user,
        session=session,
    )
