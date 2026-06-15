from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.process_roles.process.process_schema import (
    Process as ProcessSchema,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.database.db_helper import db_helper
from backend.api_v1.process_roles.process.process_repository import ProcessRepository
from backend.api_v1.process_roles.process.process_service import ProcessService
from backend.auth.jwt_auth import get_current_active_auth_user


async def get_process_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> ProcessService:
    return ProcessService(
        repository=ProcessRepository(session=session),
        user=user,
        session=session,
    )


async def process_by_id(
    process_id: int,
    service: ProcessService = Depends(get_process_service),
) -> ProcessSchema:
    record = await service.get_by_id(process_id)
    return ProcessSchema.model_validate(record)
