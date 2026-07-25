from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.job.job_repository import JobRepository
from backend.api_v1.job.job_schema import Job as JobSchema
from backend.api_v1.job.job_service import JobService
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_job_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> JobService:
    """
    Build JobService with session + employee so that _translate() can resolve
    messages in the employee's preferred language.
    """
    return JobService(
        repository=JobRepository(session=session),
        user=user,
        session=session,
    )


async def job_by_id(
    job_id: int,
    service: JobService = Depends(get_job_service),
) -> JobSchema:
    """Resolve job by ID → JobSchema. Raises JobNotFound (→ 404) if missing."""
    job = await service.get_by_id(job_id)
    return JobSchema.model_validate(job)
