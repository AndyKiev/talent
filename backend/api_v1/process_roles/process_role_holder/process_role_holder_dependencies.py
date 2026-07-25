from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.process_roles.process_role_holder.process_role_holder_repository import (
    ProcessRoleHolderRepository,
)
from backend.api_v1.process_roles.process_role_holder.process_role_holder_schema import (
    ProcessRoleHolder as ProcessRoleHolderSchema,
)
from backend.api_v1.process_roles.process_role_holder.process_role_holder_service import (
    ProcessRoleHolderService,
)
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_process_role_holder_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> ProcessRoleHolderService:
    return ProcessRoleHolderService(
        repository=ProcessRoleHolderRepository(session=session),
        user=user,
        session=session,
    )


async def process_role_holder_by_id(
    process_role_holder_id: int,
    service: ProcessRoleHolderService = Depends(get_process_role_holder_service),
) -> ProcessRoleHolderSchema:
    record = await service.get_by_id(process_role_holder_id)
    return ProcessRoleHolderSchema.model_validate(record)
