from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.candidate_note.candidate_note_repository import (
    CandidateNoteRepository,
)
from backend.api_v1.candidate_note.candidate_note_service import CandidateNoteService
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_candidate_note_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> CandidateNoteService:
    return CandidateNoteService(
        repository=CandidateNoteRepository(session=session),
        user=user,
        session=session,
    )
