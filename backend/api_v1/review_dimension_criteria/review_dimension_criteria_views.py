from fastapi import APIRouter, Depends, status, Query
from fastapi.security import HTTPBearer
from typing import Annotated, Optional, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.review_dimension_criteria.review_dimension_criteria_schema import (
    ReviewDimensionCriteria as ReviewDimensionCriteriaSchema,
    ReviewDimensionCriteriaCreate,
    ReviewDimensionCriteriaUpdate,
)
from backend.api_v1.review_dimension_criteria.review_dimension_criteria_dependencies import (
    get_review_dimension_criteria_service,
    review_dimension_criteria_by_id,
)
from backend.api_v1.review_dimension_criteria.review_dimension_criteria_service import (
    ReviewDimensionCriteriaService,
)

router = APIRouter(
    prefix="/review_dimension_criteria",
    tags=["Review Dimension Criteria"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get("", response_model=List[ReviewDimensionCriteriaSchema])
async def get_review_dimension_criteria(
    service: Annotated[
        ReviewDimensionCriteriaService,
        Depends(get_review_dimension_criteria_service),
    ],
    dimension_id: Optional[int] = None,
    sort: Optional[str] = Query(None),
):
    return await service.get_criteria(dimension_id=dimension_id, sort=sort)


@router.get("/{criteria_id}", response_model=ReviewDimensionCriteriaSchema)
async def get_single_criteria(
    record: ReviewDimensionCriteriaSchema = Depends(review_dimension_criteria_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[ReviewDimensionCriteriaSchema],
    status_code=status.HTTP_201_CREATED,
)
async def create_criteria(
    crit_in: ReviewDimensionCriteriaCreate,
    service: Annotated[
        ReviewDimensionCriteriaService,
        Depends(get_review_dimension_criteria_service),
    ],
):
    return await service.create_criteria(crit_in)


@router.patch(
    "/{criteria_id}",
    response_model=MutationResponse[ReviewDimensionCriteriaSchema],
)
async def update_criteria(
    crit_update: ReviewDimensionCriteriaUpdate,
    record: ReviewDimensionCriteriaSchema = Depends(review_dimension_criteria_by_id),
    service: Annotated[
        ReviewDimensionCriteriaService,
        Depends(get_review_dimension_criteria_service),
    ] = None,
):
    return await service.update_criteria(record.id, crit_update)


@router.delete("/{criteria_id}", status_code=status.HTTP_200_OK)
async def delete_criteria(
    criteria_id: int,
    service: Annotated[
        ReviewDimensionCriteriaService,
        Depends(get_review_dimension_criteria_service),
    ],
):
    await service.delete_criteria(criteria_id)
