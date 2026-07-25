from typing import Annotated

from fastapi import APIRouter, Depends, status

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.candidate_note.candidate_note_dependencies import (
    get_candidate_note_service,
)
from backend.api_v1.candidate_note.candidate_note_schema import (
    CandidateNoteCreate,
    CandidateNoteSchema,
)
from backend.api_v1.candidate_note.candidate_note_service import CandidateNoteService
from backend.auth.guards import Guard
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.utils.enums import EssenceName, OperationVerb

# Notes are children of a candidate — guarded on the CANDIDATE essence
# (view to read the timeline, modify to add a note).
router = APIRouter(
    prefix="/candidate_notes",
    tags=["Candidate Notes"],
    dependencies=[Depends(get_current_active_auth_user)],
)


@router.get(
    "",
    response_model=list[CandidateNoteSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.CANDIDATE)],
)
async def get_candidate_notes(
    service: Annotated[CandidateNoteService, Depends(get_candidate_note_service)],
    candidate_id: int | None = None,
):
    return await service.get_candidate_notes(candidate_id=candidate_id)


@router.post(
    "",
    response_model=MutationResponse[CandidateNoteSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.CANDIDATE)],
)
async def create_candidate_note(
    note_in: CandidateNoteCreate,
    service: Annotated[CandidateNoteService, Depends(get_candidate_note_service)],
):
    return await service.create_candidate_note(note_in)
