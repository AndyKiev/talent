from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.user_group_type.user_group_type_schema import (
    UserGroupType as UserGroupTypeSchema,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.database.db_helper import db_helper
from backend.api_v1.user_group_type.user_group_type_repository import (
    UserGroupTypeRepository,
)
from backend.api_v1.user_group_type.user_group_type_service import UserGroupTypeService
from backend.auth.jwt_auth import get_current_active_auth_user


async def get_user_group_type_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> UserGroupTypeService:
    """
    Build UserGroupTypeService with session + employee so that _translate()
    can resolve messages in the employee's preferred language.
    """
    return UserGroupTypeService(
        repository=UserGroupTypeRepository(session=session),
        user=user,
        session=session,
    )


async def user_group_type_by_id(
    user_group_type_id: int,
    service: UserGroupTypeService = Depends(get_user_group_type_service),
) -> UserGroupTypeSchema:
    """Resolve employee group type by ID → schema. Raises UserGroupTypeNotFound (→ 404) if missing."""
    record = await service.get_by_id(user_group_type_id)
    return UserGroupTypeSchema.model_validate(record)
