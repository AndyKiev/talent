from fastapi import APIRouter, Depends, status, Query
from typing import Annotated, Optional, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.candidate.candidate_schema import (
    CandidateSchema,
    CandidateCreate,
    CandidateUpdate,
)
from backend.api_v1.candidate.candidate_dependencies import (
    get_candidate_service,
    candidate_by_id,
)
from backend.api_v1.candidate.candidate_service import CandidateService
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.auth.guards import Guard
from backend.utils.enums import OperationVerb, EssenceName

router = APIRouter(
    prefix="/candidates",
    tags=["Candidates"],
    dependencies=[Depends(get_current_active_auth_user)],
)


@router.get(
    "",
    response_model=List[CandidateSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.CANDIDATE)],
)
async def get_candidates(
    service: Annotated[CandidateService, Depends(get_candidate_service)],
    sort: Optional[str] = Query(None),
):
    return await service.get_candidates(sort=sort)


@router.get(
    "/{candidate_id}",
    response_model=CandidateSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.CANDIDATE)],
)
async def get_candidate(
    record: CandidateSchema = Depends(candidate_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[CandidateSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.CANDIDATE)],
)
async def create_candidate(
    candidate_in: CandidateCreate,
    service: Annotated[CandidateService, Depends(get_candidate_service)],
):
    return await service.create_candidate(candidate_in)


@router.patch(
    "/{candidate_id}",
    response_model=MutationResponse[CandidateSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.CANDIDATE)],
)
async def update_candidate(
    candidate_update: CandidateUpdate,
    record: CandidateSchema = Depends(candidate_by_id),
    service: Annotated[CandidateService, Depends(get_candidate_service)] = None,
):
    return await service.update_candidate(record.id, candidate_update)


@router.delete(
    "/{candidate_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.CANDIDATE)],
)
async def delete_candidate(
    candidate_id: int,
    service: Annotated[CandidateService, Depends(get_candidate_service)],
):
    await service.delete_candidate(candidate_id)
