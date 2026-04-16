from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import db_helper
from backend.api_v1.user_group.user_group_repository import UserGroupRepository
from backend.api_v1.user_group.user_group_service import UserGroupService
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.api_v1.user.user_schema import User as UserSchema


async def get_user_group_repository(
    session: AsyncSession = Depends(db_helper.session_getter),
) -> UserGroupRepository:
    return UserGroupRepository(session)


async def get_user_group_service(
    repository: UserGroupRepository = Depends(get_user_group_repository),
    current_user: UserSchema = Depends(get_current_active_auth_user),
) -> UserGroupService:
    return UserGroupService(repository, current_user=current_user)
