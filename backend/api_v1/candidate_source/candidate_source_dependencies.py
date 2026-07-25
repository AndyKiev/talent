from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.candidate_source.candidate_source_repository import (
    CandidateSourceRepository,
)
from backend.api_v1.candidate_source.candidate_source_schema import (
    CandidateSource as CandidateSourceSchema,
)
from backend.api_v1.candidate_source.candidate_source_service import (
    CandidateSourceService,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_candidate_source_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> CandidateSourceService:
    return CandidateSourceService(
        repository=CandidateSourceRepository(session=session),
        user=user,
        session=session,
    )


async def candidate_source_by_id(
    candidate_source_id: int,
    service: CandidateSourceService = Depends(get_candidate_source_service),
) -> CandidateSourceSchema:
    record = await service.get_by_id(candidate_source_id)
    return CandidateSourceSchema.model_validate(record)
