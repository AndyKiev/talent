from fastapi import APIRouter, Depends, status, Query
from typing import Annotated, Optional, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.candidate_source.candidate_source_schema import (
    CandidateSource as CandidateSourceSchema,
    CandidateSourceCreate,
    CandidateSourceUpdate,
)
from backend.api_v1.candidate_source.candidate_source_dependencies import (
    get_candidate_source_service,
    candidate_source_by_id,
)
from backend.api_v1.candidate_source.candidate_source_service import (
    CandidateSourceService,
)
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.auth.guards import Guard
from backend.utils.enums import OperationVerb, EssenceName

router = APIRouter(
    prefix="/candidate_sources",
    tags=["Candidate Sources"],
    dependencies=[Depends(get_current_active_auth_user)],
)


@router.get("", response_model=List[CandidateSourceSchema])
async def get_candidate_sources(
    service: Annotated[
        CandidateSourceService, Depends(get_candidate_source_service)
    ],
    sort: Optional[str] = Query(None),
):
    return await service.get_candidate_sources(sort=sort)


@router.get("/{candidate_source_id}", response_model=CandidateSourceSchema)
async def get_candidate_source(
    record: CandidateSourceSchema = Depends(candidate_source_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[CandidateSourceSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.CANDIDATE_SOURCE)],
)
async def create_candidate_source(
    source_in: CandidateSourceCreate,
    service: Annotated[
        CandidateSourceService, Depends(get_candidate_source_service)
    ],
):
    return await service.create_candidate_source(source_in)


@router.patch(
    "/{candidate_source_id}",
    response_model=MutationResponse[CandidateSourceSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.CANDIDATE_SOURCE)],
)
async def update_candidate_source(
    source_update: CandidateSourceUpdate,
    record: CandidateSourceSchema = Depends(candidate_source_by_id),
    service: Annotated[
        CandidateSourceService, Depends(get_candidate_source_service)
    ] = None,
):
    return await service.update_candidate_source(record.id, source_update)


@router.delete(
    "/{candidate_source_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.CANDIDATE_SOURCE)],
)
async def delete_candidate_source(
    candidate_source_id: int,
    service: Annotated[
        CandidateSourceService, Depends(get_candidate_source_service)
    ],
):
    await service.delete_candidate_source(candidate_source_id)
