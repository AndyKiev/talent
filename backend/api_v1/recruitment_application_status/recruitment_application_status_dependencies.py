from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.recruitment_application_status.recruitment_application_status_repository import (
    RecruitmentApplicationStatusRepository,
)
from backend.api_v1.recruitment_application_status.recruitment_application_status_service import (
    RecruitmentApplicationStatusService,
)
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_pipeline_status_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> RecruitmentApplicationStatusService:
    return RecruitmentApplicationStatusService(
        repository=RecruitmentApplicationStatusRepository(session=session),
        user=user,
        session=session,
    )
