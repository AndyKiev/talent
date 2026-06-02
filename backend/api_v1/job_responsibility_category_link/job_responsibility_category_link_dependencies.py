from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.db_helper import db_helper
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.job_responsibility_category_link.job_responsibility_category_link_repository import (
    JobResponsibilityCategoryLinkRepository,
)
from backend.api_v1.job_responsibility_category_link.job_responsibility_category_link_service import (
    JobResponsibilityCategoryLinkService,
)
from backend.api_v1.job_responsibility_category_link.job_responsibility_category_link_schema import (
    JobResponsibilityCategoryLink as JobResponsibilityCategoryLinkSchema,
)


async def get_job_responsibility_category_link_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> JobResponsibilityCategoryLinkService:
    return JobResponsibilityCategoryLinkService(
        repository=JobResponsibilityCategoryLinkRepository(session=session),
        user=user,
        session=session,
    )


async def job_responsibility_category_link_by_id(
    job_responsibility_category_link_id: int,
    service: JobResponsibilityCategoryLinkService = Depends(
        get_job_responsibility_category_link_service
    ),
) -> JobResponsibilityCategoryLinkSchema:
    record = await service.get_by_id(job_responsibility_category_link_id)
    return JobResponsibilityCategoryLinkSchema.model_validate(record)
