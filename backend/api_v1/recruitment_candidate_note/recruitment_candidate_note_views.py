from typing import Annotated

from fastapi import APIRouter, Depends, status

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.recruitment_candidate_note.recruitment_candidate_note_dependencies import (
    get_candidate_note_service,
)
from backend.api_v1.recruitment_candidate_note.recruitment_candidate_note_schema import (
    RecruitmentCandidateNoteCreate,
    RecruitmentCandidateNoteSchema,
)
from backend.api_v1.recruitment_candidate_note.recruitment_candidate_note_service import (
    RecruitmentCandidateNoteService,
)
from backend.auth.guards import Guard
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.utils.enums import EssenceName, OperationVerb

# Notes are children of a candidate — guarded on the RECRUITMENT_CANDIDATE essence
# (view to read the timeline, modify to add a note).
router = APIRouter(
    prefix="/recruitment_candidate_notes",
    tags=["RecruitmentCandidate Notes"],
    dependencies=[Depends(get_current_active_auth_user)],
)


@router.get(
    "",
    response_model=list[RecruitmentCandidateNoteSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.RECRUITMENT_CANDIDATE)],
)
async def get_candidate_notes(
    service: Annotated[
        RecruitmentCandidateNoteService, Depends(get_candidate_note_service)
    ],
    candidate_id: int | None = None,
):
    return await service.get_candidate_notes(candidate_id=candidate_id)


@router.post(
    "",
    response_model=MutationResponse[RecruitmentCandidateNoteSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.RECRUITMENT_CANDIDATE)],
)
async def create_candidate_note(
    note_in: RecruitmentCandidateNoteCreate,
    service: Annotated[
        RecruitmentCandidateNoteService, Depends(get_candidate_note_service)
    ],
):
    return await service.create_candidate_note(note_in)
