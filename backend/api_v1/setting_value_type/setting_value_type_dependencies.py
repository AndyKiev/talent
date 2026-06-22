from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.setting_value_type.setting_value_type_schema import (
    SettingValueType as SettingValueTypeSchema,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.database.db_helper import db_helper
from backend.api_v1.setting_value_type.setting_value_type_repository import (
    SettingValueTypeRepository,
)
from backend.api_v1.setting_value_type.setting_value_type_service import (
    SettingValueTypeService,
)
from backend.auth.jwt_auth import get_current_active_auth_user


async def get_setting_value_type_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> SettingValueTypeService:
    return SettingValueTypeService(
        repository=SettingValueTypeRepository(session=session),
        user=user,
        session=session,
    )


async def setting_value_type_by_id(
    setting_value_type_id: int,
    service: SettingValueTypeService = Depends(get_setting_value_type_service),
) -> SettingValueTypeSchema:
    record = await service.get_by_id(setting_value_type_id)
    return SettingValueTypeSchema.model_validate(record)
