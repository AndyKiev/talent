from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.user.user_schema import User as UserSchema
from backend.database.db_helper import db_helper
from backend.api_v1.user.user_repository import UserRepository
from backend.api_v1.user.user_service import UserService
from backend.auth.jwt_auth import get_current_active_auth_user


async def get_user_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> UserService:
    return UserService(
        repository=UserRepository(session=session),
        user=user,
        session=session,
    )


async def user_by_id(
    user_id: int,
    service: UserService = Depends(get_user_service),
) -> UserSchema:
    return await service.get_by_id(user_id)


async def user_by_code(
    user_code: str,
    service: UserService = Depends(get_user_service),
) -> UserSchema:
    return await service.get_by_code(user_code)
