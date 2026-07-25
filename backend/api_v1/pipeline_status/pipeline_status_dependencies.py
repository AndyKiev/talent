from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.pipeline_status.pipeline_status_repository import (
    PipelineStatusRepository,
)
from backend.api_v1.pipeline_status.pipeline_status_service import PipelineStatusService
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_pipeline_status_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> PipelineStatusService:
    return PipelineStatusService(
        repository=PipelineStatusRepository(session=session),
        user=user,
        session=session,
    )
