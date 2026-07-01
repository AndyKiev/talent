from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.job_category.job_category_schema import (
    JobCategory as JobCategorySchema,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.database.db_helper import db_helper
from backend.api_v1.job_category.job_category_repository import JobCategoryRepository
from backend.api_v1.job_category.job_category_service import JobCategoryService
from backend.auth.jwt_auth import get_current_active_auth_user


async def get_job_category_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> JobCategoryService:
    return JobCategoryService(
        repository=JobCategoryRepository(session=session),
        user=user,
        session=session,
    )


async def job_category_by_id(
    job_category_id: int,
    service: JobCategoryService = Depends(get_job_category_service),
) -> JobCategorySchema:
    record = await service.get_by_id(job_category_id)
    return JobCategorySchema.model_validate(record)
