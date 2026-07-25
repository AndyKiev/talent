from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.job_job_category_link.job_job_category_link_repository import (
    JobJobCategoryLinkRepository,
)
from backend.api_v1.job_job_category_link.job_job_category_link_service import (
    JobJobCategoryLinkService,
)
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_job_job_category_link_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    current_user: EmployeeSchema = Depends(get_current_active_auth_user),
) -> JobJobCategoryLinkService:
    return JobJobCategoryLinkService(
        repository=JobJobCategoryLinkRepository(session=session),
        user=current_user,
        session=session,
    )
