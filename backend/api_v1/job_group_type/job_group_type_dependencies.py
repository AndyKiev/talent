from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.job_group_type.job_group_type_repository import (
    JobGroupTypeRepository,
)
from backend.api_v1.job_group_type.job_group_type_schema import (
    JobGroupType as JobGroupTypeSchema,
)
from backend.api_v1.job_group_type.job_group_type_service import JobGroupTypeService
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_job_group_type_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    current_user: EmployeeSchema = Depends(get_current_active_auth_user),
) -> JobGroupTypeService:
    return JobGroupTypeService(
        repository=JobGroupTypeRepository(session=session),
        user=current_user,
        session=session,
    )


async def job_group_type_by_id(
    job_group_type_id: int,
    service: JobGroupTypeService = Depends(get_job_group_type_service),
) -> JobGroupTypeSchema:
    return await service.get_job_group_type_by_id(job_group_type_id)
