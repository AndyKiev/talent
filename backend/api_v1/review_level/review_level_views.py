from fastapi import APIRouter, Depends, status, Query
from fastapi.security import HTTPBearer
from typing import Annotated, Optional, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.review_level.review_level_schema import (
    ReviewLevel as ReviewLevelSchema,
    ReviewLevelCreate,
    ReviewLevelUpdate,
)
from backend.api_v1.review_level.review_level_dependencies import (
    get_review_level_service,
    review_level_by_id,
)
from backend.api_v1.review_level.review_level_service import ReviewLevelService

router = APIRouter(
    prefix="/review_levels",
    tags=["Review Levels"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get("", response_model=List[ReviewLevelSchema])
async def get_review_levels(
    service: Annotated[ReviewLevelService, Depends(get_review_level_service)],
    is_active: Optional[bool] = None,
    sort: Optional[str] = Query(None),
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
)
async def create_review_level(
    level_in: ReviewLevelCreate,
    service: Annotated[ReviewLevelService, Depends(get_review_level_service)],
):
    return await service.create_level(level_in)


@router.patch(
    "/{review_level_id}",
    response_model=MutationResponse[ReviewLevelSchema],
)
async def update_review_level(
    level_update: ReviewLevelUpdate,
    record: ReviewLevelSchema = Depends(review_level_by_id),
    service: Annotated[ReviewLevelService, Depends(get_review_level_service)] = None,
):
    return await service.update_level(record.id, level_update)


@router.delete("/{review_level_id}", status_code=status.HTTP_200_OK)
async def delete_review_level(
    review_level_id: int,
    service: Annotated[ReviewLevelService, Depends(get_review_level_service)],
):
    await service.delete_level(review_level_id)
