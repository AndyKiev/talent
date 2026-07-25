from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.recruitment_task_status.recruitment_task_status_repository import (
    RecruitmentTaskStatusRepository,
)
from backend.api_v1.recruitment_task_status.recruitment_task_status_service import (
    RecruitmentTaskStatusService,
)
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_recruitment_task_status_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> RecruitmentTaskStatusService:
    return RecruitmentTaskStatusService(
        repository=RecruitmentTaskStatusRepository(session=session),
        user=user,
        session=session,
    )
