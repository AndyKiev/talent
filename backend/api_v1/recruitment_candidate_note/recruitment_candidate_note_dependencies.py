from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.recruitment_candidate_note.recruitment_candidate_note_repository import (
    RecruitmentCandidateNoteRepository,
)
from backend.api_v1.recruitment_candidate_note.recruitment_candidate_note_service import (
    RecruitmentCandidateNoteService,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_candidate_note_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> RecruitmentCandidateNoteService:
    return RecruitmentCandidateNoteService(
        repository=RecruitmentCandidateNoteRepository(session=session),
        user=user,
        session=session,
    )
