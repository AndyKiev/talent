from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.process_roles.process_role.process_role_repository import (
    ProcessRoleRepository,
)
from backend.api_v1.process_roles.process_role.process_role_schema import (
    ProcessRole as ProcessRoleSchema,
)
from backend.api_v1.process_roles.process_role.process_role_service import (
    ProcessRoleService,
)
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_process_role_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> ProcessRoleService:
    return ProcessRoleService(
        repository=ProcessRoleRepository(session=session),
        user=user,
        session=session,
    )


async def process_role_by_id(
    process_role_id: int,
    service: ProcessRoleService = Depends(get_process_role_service),
) -> ProcessRoleSchema:
    record = await service.get_by_id(process_role_id)
    return ProcessRoleSchema.model_validate(record)
