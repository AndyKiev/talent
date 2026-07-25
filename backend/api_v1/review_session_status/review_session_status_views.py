from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.security import HTTPBearer

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.review_session_status.review_session_status_dependencies import (
    get_review_session_status_service,
    review_session_status_by_id,
)
from backend.api_v1.review_session_status.review_session_status_schema import (
    ReviewSessionStatus as ReviewSessionStatusSchema,
)
from backend.api_v1.review_session_status.review_session_status_schema import (
    ReviewSessionStatusCreate,
    ReviewSessionStatusUpdate,
)
from backend.api_v1.review_session_status.review_session_status_service import (
    ReviewSessionStatusService,
)
from backend.auth.guards import Guard
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/review_session_statuses",
    tags=["Review Session Statuses"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "",
    response_model=list[ReviewSessionStatusSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.REVIEW_SESSION_STATUS)],
)
async def get_review_session_statuses(
    service: Annotated[
        ReviewSessionStatusService, Depends(get_review_session_status_service)
    ],
    sort: str | None = Query(None, description='JSON: {"field": "asc|desc"}'),
):
    return await service.get_review_session_statuses(sort=sort)


@router.get(
    "/{review_session_status_id}",
    response_model=ReviewSessionStatusSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.REVIEW_SESSION_STATUS)],
)
async def get_review_session_status(
    record: ReviewSessionStatusSchema = Depends(review_session_status_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[ReviewSessionStatusSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.REVIEW_SESSION_STATUS)],
)
async def create_review_session_status(
    status_in: ReviewSessionStatusCreate,
    service: Annotated[
        ReviewSessionStatusService, Depends(get_review_session_status_service)
    ],
):
    return await service.create_review_session_status(status_in)


@router.patch(
    "/{review_session_status_id}",
    response_model=MutationResponse[ReviewSessionStatusSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.REVIEW_SESSION_STATUS)],
)
async def update_review_session_status(
    status_update: ReviewSessionStatusUpdate,
    record: ReviewSessionStatusSchema = Depends(review_session_status_by_id),
    service: Annotated[
        ReviewSessionStatusService, Depends(get_review_session_status_service)
    ] = None,
):
    return await service.update_review_session_status(record.id, status_update)


@router.delete(
    "/{review_session_status_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.REVIEW_SESSION_STATUS)],
)
async def delete_review_session_status(
    review_session_status_id: int,
    service: Annotated[
        ReviewSessionStatusService, Depends(get_review_session_status_service)
    ],
):
    await service.delete_review_session_status(review_session_status_id)
