from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.recruitment_task.recruitment_task_repository import (
    RecruitmentTaskRepository,
)
from backend.api_v1.recruitment_task.recruitment_task_schema import (
    RecruitmentTaskSchema,
)
from backend.api_v1.recruitment_task.recruitment_task_service import (
    RecruitmentTaskService,
)
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_recruitment_task_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> RecruitmentTaskService:
    return RecruitmentTaskService(
        repository=RecruitmentTaskRepository(session=session),
        user=user,
        session=session,
    )


async def recruitment_task_by_id(
    recruitment_task_id: int,
    service: RecruitmentTaskService = Depends(get_recruitment_task_service),
) -> RecruitmentTaskSchema:
    record = await service.get_by_id(recruitment_task_id)
    return RecruitmentTaskSchema.model_validate(record)
