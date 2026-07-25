from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.audit.change_session.change_session_repository import (
    ChangeSessionRepository,
)
from backend.api_v1.audit.change_session.change_session_schema import (
    ChangeSessionSchema,
)
from backend.api_v1.audit.change_session.change_session_service import (
    ChangeSessionService,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_change_session_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> ChangeSessionService:
    return ChangeSessionService(
        repository=ChangeSessionRepository(session=session),
        user=user,
        session=session,
    )


async def change_session_by_id(
    change_session_id: int,
    service: ChangeSessionService = Depends(get_change_session_service),
) -> ChangeSessionSchema:
    record = await service.get_by_id(change_session_id)
    return ChangeSessionSchema.model_validate(record)
