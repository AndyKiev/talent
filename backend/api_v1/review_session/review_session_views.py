from fastapi import APIRouter, Depends, status, Query
from fastapi.security import HTTPBearer
from typing import Annotated, Optional, List, Any

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.review_session.review_session_schema import (
    ReviewSession as ReviewSessionSchema,
    ReviewSessionCreate,
    ReviewSessionUpdate,
)
from backend.api_v1.review_session.review_session_dependencies import (
    get_review_session_service,
    review_session_by_id,
)
from backend.api_v1.review_session.review_session_service import (
    ReviewSessionService,
)

router = APIRouter(
    prefix="/review_sessions",
    tags=["Review Sessions"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get("", response_model=List[ReviewSessionSchema])
async def get_review_sessions(
    service: Annotated[
        ReviewSessionService, Depends(get_review_session_service)
    ],
    status_filter: Optional[str] = Query(None, alias="status"),
    sort: Optional[str] = Query(None),
):
    return await service.get_review_sessions(status=status_filter, sort=sort)


@router.get("/{review_session_id}", response_model=ReviewSessionSchema)
async def get_review_session(
    record: ReviewSessionSchema = Depends(review_session_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[ReviewSessionSchema],
    status_code=status.HTTP_201_CREATED,
)
async def create_review_session(
    rs_in: ReviewSessionCreate,
    service: Annotated[
        ReviewSessionService, Depends(get_review_session_service)
    ],
):
    return await service.create_review_session(rs_in)


@router.patch(
    "/{review_session_id}",
    response_model=MutationResponse[ReviewSessionSchema],
)
async def update_review_session(
    rs_update: ReviewSessionUpdate,
    record: ReviewSessionSchema = Depends(review_session_by_id),
    service: Annotated[
        ReviewSessionService, Depends(get_review_session_service)
    ] = None,
):
    return await service.update_review_session(record.id, rs_update)


@router.post(
    "/{review_session_id}/open",
    response_model=MutationResponse[ReviewSessionSchema],
)
async def open_review_session(
    review_session_id: int,
    service: Annotated[
        ReviewSessionService, Depends(get_review_session_service)
    ],
):
    return await service.open_session(review_session_id)


@router.post(
    "/{review_session_id}/close",
    response_model=MutationResponse[ReviewSessionSchema],
)
async def close_review_session(
    review_session_id: int,
    service: Annotated[
        ReviewSessionService, Depends(get_review_session_service)
    ],
):
    return await service.close_session(review_session_id)


@router.post(
    "/{review_session_id}/revert",
    response_model=MutationResponse[ReviewSessionSchema],
)
async def revert_review_session(
    review_session_id: int,
    service: Annotated[
        ReviewSessionService, Depends(get_review_session_service)
    ],
):
    return await service.revert_session(review_session_id)


@router.get("/{review_session_id}/analytics", response_model=List[Any])
async def get_session_analytics(
    review_session_id: int,
    service: Annotated[ReviewSessionService, Depends(get_review_session_service)],
):
    return await service.get_analytics(review_session_id)


@router.delete("/{review_session_id}", status_code=status.HTTP_200_OK)
async def delete_review_session(
    review_session_id: int,
    service: Annotated[
        ReviewSessionService, Depends(get_review_session_service)
    ],
):
    await service.delete_review_session(review_session_id)
