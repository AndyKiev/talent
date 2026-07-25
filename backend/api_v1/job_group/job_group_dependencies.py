from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.job_group.job_group_repository import JobGroupRepository
from backend.api_v1.job_group.job_group_schema import JobGroup as JobGroupSchema
from backend.api_v1.job_group.job_group_service import JobGroupService
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_job_group_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    current_user: EmployeeSchema = Depends(get_current_active_auth_user),
) -> JobGroupService:
    return JobGroupService(
        repository=JobGroupRepository(session=session),
        user=current_user,
        session=session,
    )


async def job_group_by_id(
    job_group_id: int,
    service: JobGroupService = Depends(get_job_group_service),
) -> JobGroupSchema:
    return await service.get_job_group_by_id(job_group_id)
