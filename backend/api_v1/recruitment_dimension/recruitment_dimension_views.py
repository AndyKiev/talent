from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.recruitment_dimension.recruitment_dimension_dependencies import (
    get_recruitment_dimension_service,
    recruitment_dimension_by_id,
)
from backend.api_v1.recruitment_dimension.recruitment_dimension_schema import (
    RecruitmentDimension as RecruitmentDimensionSchema,
)
from backend.api_v1.recruitment_dimension.recruitment_dimension_schema import (
    RecruitmentDimensionCreate,
    RecruitmentDimensionUpdate,
)
from backend.api_v1.recruitment_dimension.recruitment_dimension_service import (
    RecruitmentDimensionService,
)
from backend.auth.guards import Guard
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/recruitment_dimensions",
    tags=["Recruitment Dimensions"],
    dependencies=[Depends(get_current_active_auth_user)],
)


@router.get("", response_model=list[RecruitmentDimensionSchema])
async def get_recruitment_dimensions(
    service: Annotated[
        RecruitmentDimensionService, Depends(get_recruitment_dimension_service)
    ],
    name: str | None = None,
    is_active: bool | None = None,
    sort: str | None = Query(None),
):
    return await service.get_recruitment_dimensions(
        name=name, is_active=is_active, sort=sort
    )


@router.get("/{recruitment_dimension_id}", response_model=RecruitmentDimensionSchema)
async def get_recruitment_dimension(
    record: RecruitmentDimensionSchema = Depends(recruitment_dimension_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[RecruitmentDimensionSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.RECRUITMENT_DIMENSION)],
)
async def create_recruitment_dimension(
    dim_in: RecruitmentDimensionCreate,
    service: Annotated[
        RecruitmentDimensionService, Depends(get_recruitment_dimension_service)
    ],
):
    return await service.create_recruitment_dimension(dim_in)


@router.patch(
    "/{recruitment_dimension_id}",
    response_model=MutationResponse[RecruitmentDimensionSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.RECRUITMENT_DIMENSION)],
)
async def update_recruitment_dimension(
    dim_update: RecruitmentDimensionUpdate,
    record: RecruitmentDimensionSchema = Depends(recruitment_dimension_by_id),
    service: Annotated[
        RecruitmentDimensionService, Depends(get_recruitment_dimension_service)
    ] = None,
):
    return await service.update_recruitment_dimension(record.id, dim_update)


@router.delete(
    "/{recruitment_dimension_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.RECRUITMENT_DIMENSION)],
)
async def delete_recruitment_dimension(
    recruitment_dimension_id: int,
    service: Annotated[
        RecruitmentDimensionService, Depends(get_recruitment_dimension_service)
    ],
):
    await service.delete_recruitment_dimension(recruitment_dimension_id)
