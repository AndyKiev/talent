from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.app_setting.app_setting_repository import AppSettingRepository
from backend.api_v1.app_setting.app_setting_schema import (
    AppSetting as AppSettingSchema,
)
from backend.api_v1.app_setting.app_setting_service import AppSettingService
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_app_setting_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> AppSettingService:
    return AppSettingService(
        repository=AppSettingRepository(session=session),
        user=user,
        session=session,
    )


async def app_setting_by_id(
    app_setting_id: int,
    service: AppSettingService = Depends(get_app_setting_service),
) -> AppSettingSchema:
    record = await service.get_by_id(app_setting_id)
    return AppSettingSchema.from_orm_with_groups(record)
