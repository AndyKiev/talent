from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.recruitment_candidate.recruitment_candidate_dependencies import (
    candidate_by_id,
    get_candidate_service,
)
from backend.api_v1.recruitment_candidate.recruitment_candidate_schema import (
    RecruitmentCandidateCreate,
    RecruitmentCandidateSchema,
    RecruitmentCandidateUpdate,
)
from backend.api_v1.recruitment_candidate.recruitment_candidate_service import (
    RecruitmentCandidateService,
)
from backend.auth.guards import Guard
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/recruitment_candidates",
    tags=["Candidates"],
    dependencies=[Depends(get_current_active_auth_user)],
)


@router.get(
    "",
    response_model=list[RecruitmentCandidateSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.RECRUITMENT_CANDIDATE)],
)
async def get_candidates(
    service: Annotated[RecruitmentCandidateService, Depends(get_candidate_service)],
    sort: str | None = Query(None),
):
    return await service.get_candidates(sort=sort)


@router.get(
    "/{candidate_id}",
    response_model=RecruitmentCandidateSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.RECRUITMENT_CANDIDATE)],
)
async def get_candidate(
    record: RecruitmentCandidateSchema = Depends(candidate_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[RecruitmentCandidateSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.RECRUITMENT_CANDIDATE)],
)
async def create_candidate(
    candidate_in: RecruitmentCandidateCreate,
    service: Annotated[RecruitmentCandidateService, Depends(get_candidate_service)],
):
    return await service.create_candidate(candidate_in)


@router.patch(
    "/{candidate_id}",
    response_model=MutationResponse[RecruitmentCandidateSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.RECRUITMENT_CANDIDATE)],
)
async def update_candidate(
    candidate_update: RecruitmentCandidateUpdate,
    record: RecruitmentCandidateSchema = Depends(candidate_by_id),
    service: Annotated[
        RecruitmentCandidateService, Depends(get_candidate_service)
    ] = None,
):
    return await service.update_candidate(record.id, candidate_update)


@router.delete(
    "/{candidate_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.RECRUITMENT_CANDIDATE)],
)
async def delete_candidate(
    candidate_id: int,
    service: Annotated[RecruitmentCandidateService, Depends(get_candidate_service)],
):
    await service.delete_candidate(candidate_id)
