from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.user_group.user_group_repository import UserGroupRepository
from backend.api_v1.user_group.user_group_service import UserGroupService
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_user_group_repository(
    session: AsyncSession = Depends(db_helper.session_getter),
) -> UserGroupRepository:
    return UserGroupRepository(session)

    # repository: UserGroupRepository = Depends(get_user_group_repository),


async def get_user_group_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    current_user: EmployeeSchema = Depends(get_current_active_auth_user),
) -> UserGroupService:
    # return UserGroupService(repository, user=current_user)
    return UserGroupService(
        repository=UserGroupRepository(session=session),
        user=current_user,
        session=session,
    )
