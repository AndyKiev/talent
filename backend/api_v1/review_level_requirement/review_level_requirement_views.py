from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.review_level_requirement.review_level_requirement_dependencies import (
    get_review_level_requirement_service,
    review_level_requirement_by_id,
)
from backend.api_v1.review_level_requirement.review_level_requirement_schema import (
    ReviewLevelRequirement as ReviewLevelRequirementSchema,
)
from backend.api_v1.review_level_requirement.review_level_requirement_schema import (
    ReviewLevelRequirementCreate,
    ReviewLevelRequirementUpdate,
)
from backend.api_v1.review_level_requirement.review_level_requirement_service import (
    ReviewLevelRequirementService,
)
from backend.auth.guards import Guard
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/review_level_requirements",
    tags=["Review Level Requirements"],
    dependencies=[Depends(get_current_active_auth_user)],
)


@router.get("", response_model=list[ReviewLevelRequirementSchema])
async def get_review_level_requirements(
    service: Annotated[
        ReviewLevelRequirementService,
        Depends(get_review_level_requirement_service),
    ],
    level_id: int | None = None,
    is_active: bool | None = None,
    sort: str | None = Query(None),
):
    return await service.get_requirements(
        level_id=level_id, is_active=is_active, sort=sort
    )


@router.get("/{requirement_id}", response_model=ReviewLevelRequirementSchema)
async def get_single_requirement(
    record: ReviewLevelRequirementSchema = Depends(review_level_requirement_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[ReviewLevelRequirementSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.REVIEW_LEVEL_REQUIREMENT)],
)
async def create_requirement(
    req_in: ReviewLevelRequirementCreate,
    service: Annotated[
        ReviewLevelRequirementService,
        Depends(get_review_level_requirement_service),
    ],
):
    return await service.create_requirement(req_in)


@router.patch(
    "/{requirement_id}",
    response_model=MutationResponse[ReviewLevelRequirementSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.REVIEW_LEVEL_REQUIREMENT)],
)
async def update_requirement(
    req_update: ReviewLevelRequirementUpdate,
    record: ReviewLevelRequirementSchema = Depends(review_level_requirement_by_id),
    service: Annotated[
        ReviewLevelRequirementService,
        Depends(get_review_level_requirement_service),
    ] = None,
):
    return await service.update_requirement(record.id, req_update)


@router.delete(
    "/{requirement_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.REVIEW_LEVEL_REQUIREMENT)],
)
async def delete_requirement(
    requirement_id: int,
    service: Annotated[
        ReviewLevelRequirementService,
        Depends(get_review_level_requirement_service),
    ],
):
    await service.delete_requirement(requirement_id)
