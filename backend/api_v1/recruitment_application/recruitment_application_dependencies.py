from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.recruitment_application.recruitment_application_repository import (
    RecruitmentApplicationRepository,
)
from backend.api_v1.recruitment_application.recruitment_application_schema import (
    RecruitmentApplicationSchema,
)
from backend.api_v1.recruitment_application.recruitment_application_service import (
    RecruitmentApplicationService,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_candidate_application_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> RecruitmentApplicationService:
    return RecruitmentApplicationService(
        repository=RecruitmentApplicationRepository(session=session),
        user=user,
        session=session,
    )


async def candidate_application_by_id(
    candidate_application_id: int,
    service: RecruitmentApplicationService = Depends(get_candidate_application_service),
) -> RecruitmentApplicationSchema:
    record = await service.get_by_id(candidate_application_id)
    return RecruitmentApplicationSchema.model_validate(record)
