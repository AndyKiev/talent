from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.candidate.candidate_repository import CandidateRepository
from backend.api_v1.candidate.candidate_schema import CandidateSchema
from backend.api_v1.candidate.candidate_service import CandidateService
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_candidate_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> CandidateService:
    return CandidateService(
        repository=CandidateRepository(session=session),
        user=user,
        session=session,
    )


async def candidate_by_id(
    candidate_id: int,
    service: CandidateService = Depends(get_candidate_service),
) -> CandidateSchema:
    record = await service.get_by_id(candidate_id)
    return service._to_schema(record)
