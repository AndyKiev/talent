from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.database.db_helper import db_helper
from backend.api_v1.process_roles.process_role_holder_employee_link.process_role_holder_employee_link_repository import (
    ProcessRoleHolderEmployeeLinkRepository,
)
from backend.api_v1.process_roles.oversight_manager.oversight_manager_service import (
    OversightManagerService,
)
from backend.auth.jwt_auth import get_current_active_auth_user


async def get_oversight_manager_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> OversightManagerService:
    return OversightManagerService(
        repository=ProcessRoleHolderEmployeeLinkRepository(session=session),
        user=user,
        session=session,
    )
