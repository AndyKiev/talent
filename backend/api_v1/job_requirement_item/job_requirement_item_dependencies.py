from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.job_requirement_item.job_requirement_item_repository import (
    JobRequirementItemRepository,
)
from backend.api_v1.job_requirement_item.job_requirement_item_schema import (
    JobRequirementItemSchema,
)
from backend.api_v1.job_requirement_item.job_requirement_item_service import (
    JobRequirementItemService,
)
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_job_requirement_item_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> JobRequirementItemService:
    return JobRequirementItemService(
        repository=JobRequirementItemRepository(session=session),
        user=user,
        session=session,
    )


async def job_requirement_item_by_id(
    job_requirement_item_id: int,
    service: JobRequirementItemService = Depends(get_job_requirement_item_service),
) -> JobRequirementItemSchema:
    record = await service.get_by_id(job_requirement_item_id)
    return JobRequirementItemSchema.model_validate(record)
