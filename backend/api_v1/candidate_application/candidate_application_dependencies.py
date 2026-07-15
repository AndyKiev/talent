from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.candidate_application.candidate_application_schema import (
    CandidateApplicationSchema,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.database.db_helper import db_helper
from backend.api_v1.candidate_application.candidate_application_repository import (
    CandidateApplicationRepository,
)
from backend.api_v1.candidate_application.candidate_application_service import (
    CandidateApplicationService,
)
from backend.auth.jwt_auth import get_current_active_auth_user


async def get_candidate_application_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> CandidateApplicationService:
    return CandidateApplicationService(
        repository=CandidateApplicationRepository(session=session),
        user=user,
        session=session,
    )


async def candidate_application_by_id(
    candidate_application_id: int,
    service: CandidateApplicationService = Depends(get_candidate_application_service),
) -> CandidateApplicationSchema:
    record = await service.get_by_id(candidate_application_id)
    return CandidateApplicationSchema.model_validate(record)
