from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.recruitment_dimension.recruitment_dimension_repository import (
    RecruitmentDimensionRepository,
)
from backend.api_v1.recruitment_dimension.recruitment_dimension_schema import (
    RecruitmentDimension as RecruitmentDimensionSchema,
)
from backend.api_v1.recruitment_dimension.recruitment_dimension_service import (
    RecruitmentDimensionService,
)
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_recruitment_dimension_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> RecruitmentDimensionService:
    return RecruitmentDimensionService(
        repository=RecruitmentDimensionRepository(session=session),
        user=user,
        session=session,
    )


async def recruitment_dimension_by_id(
    recruitment_dimension_id: int,
    service: RecruitmentDimensionService = Depends(get_recruitment_dimension_service),
) -> RecruitmentDimensionSchema:
    record = await service.get_by_id(recruitment_dimension_id)
    return RecruitmentDimensionSchema.model_validate(record)
