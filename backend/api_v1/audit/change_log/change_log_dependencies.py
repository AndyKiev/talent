from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.db_helper import db_helper
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.audit.change_log.change_log_repository import ChangeLogRepository
from backend.api_v1.audit.change_log.change_log_service import ChangeLogService
from backend.api_v1.audit.change_log.change_log_schema import ChangeLogSchema


async def get_change_log_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> ChangeLogService:
    return ChangeLogService(
        repository=ChangeLogRepository(session=session),
        user=user,
        session=session,
    )


async def change_log_by_id(
    change_log_id: int,
    service: ChangeLogService = Depends(get_change_log_service),
) -> ChangeLogSchema:
    record = await service.get_by_id(change_log_id)
    return ChangeLogSchema.model_validate(record)
