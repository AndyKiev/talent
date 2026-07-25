from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.job_process_role_link.job_process_role_link_repository import (
    JobProcessRoleLinkRepository,
)
from backend.api_v1.job_process_role_link.job_process_role_link_service import (
    JobProcessRoleLinkService,
)
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_job_process_role_link_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    current_user: EmployeeSchema = Depends(get_current_active_auth_user),
) -> JobProcessRoleLinkService:
    return JobProcessRoleLinkService(
        repository=JobProcessRoleLinkRepository(session=session),
        user=current_user,
        session=session,
    )
