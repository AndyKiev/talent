from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.database.db_helper import db_helper
from backend.api_v1.process_roles.process_role_holder_department_link.process_role_holder_department_link_repository import (
    ProcessRoleHolderDepartmentLinkRepository,
)
from backend.api_v1.process_roles.process_role_holder_department_link.process_role_holder_department_link_service import (
    ProcessRoleHolderDepartmentLinkService,
)
from backend.auth.jwt_auth import get_current_active_auth_user


async def get_process_role_holder_department_link_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> ProcessRoleHolderDepartmentLinkService:
    return ProcessRoleHolderDepartmentLinkService(
        repository=ProcessRoleHolderDepartmentLinkRepository(session=session),
        user=user,
        session=session,
    )
