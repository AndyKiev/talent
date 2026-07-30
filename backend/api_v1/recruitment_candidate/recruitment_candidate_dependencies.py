from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.recruitment_candidate.recruitment_candidate_repository import (
    RecruitmentCandidateRepository,
)
from backend.api_v1.recruitment_candidate.recruitment_candidate_schema import (
    RecruitmentCandidateSchema,
)
from backend.api_v1.recruitment_candidate.recruitment_candidate_service import (
    RecruitmentCandidateService,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_candidate_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> RecruitmentCandidateService:
    return RecruitmentCandidateService(
        repository=RecruitmentCandidateRepository(session=session),
        user=user,
        session=session,
    )


async def candidate_by_id(
    candidate_id: int,
    service: RecruitmentCandidateService = Depends(get_candidate_service),
) -> RecruitmentCandidateSchema:
    record = await service.get_by_id(candidate_id)
    return service._to_schema(record)
