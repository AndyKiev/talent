from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.job_requirement_group.job_requirement_group_schema import (
    JobRequirementGroupSchema,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.database.db_helper import db_helper
from backend.api_v1.job_requirement_group.job_requirement_group_repository import (
    JobRequirementGroupRepository,
)
from backend.api_v1.job_requirement_group.job_requirement_group_service import (
    JobRequirementGroupService,
)
from backend.auth.jwt_auth import get_current_active_auth_user


async def get_job_requirement_group_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> JobRequirementGroupService:
    return JobRequirementGroupService(
        repository=JobRequirementGroupRepository(session=session),
        user=user,
        session=session,
    )


async def job_requirement_group_by_id(
    job_requirement_group_id: int,
    service: JobRequirementGroupService = Depends(get_job_requirement_group_service),
) -> JobRequirementGroupSchema:
    record = await service.get_by_id(job_requirement_group_id)
    return JobRequirementGroupSchema.model_validate(record)
