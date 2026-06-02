from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.db_helper import db_helper
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.job_job_group_link.job_job_group_link_repository import (
    JobJobGroupLinkRepository,
)
from backend.api_v1.job_job_group_link.job_job_group_link_service import (
    JobJobGroupLinkService,
)


async def get_job_job_group_link_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    current_user: EmployeeSchema = Depends(get_current_active_auth_user),
) -> JobJobGroupLinkService:
    return JobJobGroupLinkService(
        repository=JobJobGroupLinkRepository(session=session),
        user=current_user,
        session=session,
    )
