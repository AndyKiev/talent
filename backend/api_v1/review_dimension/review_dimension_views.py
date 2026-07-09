from fastapi import APIRouter, Depends, status, Query
from typing import Annotated, Optional, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.review_dimension.review_dimension_schema import (
    ReviewDimension as ReviewDimensionSchema,
    ReviewDimensionCreate,
    ReviewDimensionUpdate,
)
from backend.api_v1.review_dimension.review_dimension_dependencies import (
    get_review_dimension_service,
    review_dimension_by_id,
)
from backend.api_v1.review_dimension.review_dimension_service import (
    ReviewDimensionService,
)
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.auth.guards import Guard
from backend.utils.enums import OperationVerb, EssenceName

router = APIRouter(
    prefix="/review_dimensions",
    tags=["Review Dimensions"],
    dependencies=[Depends(get_current_active_auth_user)],
)


@router.get("", response_model=List[ReviewDimensionSchema])
async def get_review_dimensions(
    service: Annotated[ReviewDimensionService, Depends(get_review_dimension_service)],
    name: Optional[str] = None,
    is_active: Optional[bool] = None,
    sort: Optional[str] = Query(None),
):
    return await service.get_review_dimensions(
        name=name, is_active=is_active, sort=sort
    )


@router.get("/{review_dimension_id}", response_model=ReviewDimensionSchema)
async def get_review_dimension(
    record: ReviewDimensionSchema = Depends(review_dimension_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[ReviewDimensionSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.REVIEW_DIMENSION)],
)
async def create_review_dimension(
    dim_in: ReviewDimensionCreate,
    service: Annotated[ReviewDimensionService, Depends(get_review_dimension_service)],
):
    return await service.create_review_dimension(dim_in)


@router.patch(
    "/{review_dimension_id}",
    response_model=MutationResponse[ReviewDimensionSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.REVIEW_DIMENSION)],
)
async def update_review_dimension(
    dim_update: ReviewDimensionUpdate,
    record: ReviewDimensionSchema = Depends(review_dimension_by_id),
    service: Annotated[
        ReviewDimensionService, Depends(get_review_dimension_service)
    ] = None,
):
    return await service.update_review_dimension(record.id, dim_update)


@router.delete(
    "/{review_dimension_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.REVIEW_DIMENSION)],
)
async def delete_review_dimension(
    review_dimension_id: int,
    service: Annotated[ReviewDimensionService, Depends(get_review_dimension_service)],
):
    await service.delete_review_dimension(review_dimension_id)
