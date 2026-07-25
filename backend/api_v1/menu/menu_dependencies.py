from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.menu.menu_repository import MenuRepository
from backend.api_v1.menu.menu_service import MenuService
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession


async def get_menu_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> MenuService:
    return MenuService(
        repository=MenuRepository(session=session),
        user=user,
        session=session,
    )
