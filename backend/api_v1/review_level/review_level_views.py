from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.review_level.review_level_dependencies import (
    get_review_level_service,
    review_level_by_id,
)
from backend.api_v1.review_level.review_level_schema import (
    ReviewLevel as ReviewLevelSchema,
)
from backend.api_v1.review_level.review_level_schema import (
    ReviewLevelCreate,
    ReviewLevelUpdate,
)
from backend.api_v1.review_level.review_level_service import ReviewLevelService
from backend.auth.guards import Guard
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/review_levels",
    tags=["Review Levels"],
    dependencies=[Depends(get_current_active_auth_user)],
)


@router.get("", response_model=list[ReviewLevelSchema])
async def get_review_levels(
    service: Annotated[ReviewLevelService, Depends(get_review_level_service)],
    is_active: bool | None = None,
    sort: str | None = Query(None),
):
    return await service.get_levels(is_active=is_active, sort=sort)


@router.get("/{review_level_id}", response_model=ReviewLevelSchema)
async def get_review_level(
    record: ReviewLevelSchema = Depends(review_level_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[ReviewLevelSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.REVIEW_LEVEL)],
)
async def create_review_level(
    level_in: ReviewLevelCreate,
    service: Annotated[ReviewLevelService, Depends(get_review_level_service)],
):
    return await service.create_level(level_in)


@router.patch(
    "/{review_level_id}",
    response_model=MutationResponse[ReviewLevelSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.REVIEW_LEVEL)],
)
async def update_review_level(
    level_update: ReviewLevelUpdate,
    record: ReviewLevelSchema = Depends(review_level_by_id),
    service: Annotated[ReviewLevelService, Depends(get_review_level_service)] = None,
):
    return await service.update_level(record.id, level_update)


@router.delete(
    "/{review_level_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.REVIEW_LEVEL)],
)
async def delete_review_level(
    review_level_id: int,
    service: Annotated[ReviewLevelService, Depends(get_review_level_service)],
):
    await service.delete_level(review_level_id)
