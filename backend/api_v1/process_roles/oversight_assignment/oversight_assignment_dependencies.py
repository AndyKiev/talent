from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.process_roles.oversight_assignment.oversight_assignment_service import (
    OversightAssignmentService,
)
from backend.api_v1.process_roles.process_role_holder_employee_link.process_role_holder_employee_link_repository import (
    ProcessRoleHolderEmployeeLinkRepository,
)
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_oversight_assignment_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> OversightAssignmentService:
    return OversightAssignmentService(
        repository=ProcessRoleHolderEmployeeLinkRepository(session=session),
        user=user,
        session=session,
    )
