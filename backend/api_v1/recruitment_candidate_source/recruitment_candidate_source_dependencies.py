from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.recruitment_candidate_source.recruitment_candidate_source_repository import (
    RecruitmentCandidateSourceRepository,
)
from backend.api_v1.recruitment_candidate_source.recruitment_candidate_source_schema import (
    RecruitmentCandidateSource as RecruitmentCandidateSourceSchema,
)
from backend.api_v1.recruitment_candidate_source.recruitment_candidate_source_service import (
    RecruitmentCandidateSourceService,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_candidate_source_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> RecruitmentCandidateSourceService:
    return RecruitmentCandidateSourceService(
        repository=RecruitmentCandidateSourceRepository(session=session),
        user=user,
        session=session,
    )


async def candidate_source_by_id(
    candidate_source_id: int,
    service: RecruitmentCandidateSourceService = Depends(get_candidate_source_service),
) -> RecruitmentCandidateSourceSchema:
    record = await service.get_by_id(candidate_source_id)
    return RecruitmentCandidateSourceSchema.model_validate(record)
