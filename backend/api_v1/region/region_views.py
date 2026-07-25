from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.security import HTTPBearer

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.region.region_dependencies import (
    get_region_service,
    region_by_id,
)
from backend.api_v1.region.region_schema import (
    Region as RegionSchema,
)
from backend.api_v1.region.region_schema import (
    RegionCreate,
    RegionMove,
    RegionUpdate,
)
from backend.api_v1.region.region_service import RegionService
from backend.auth.guards import Guard
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/regions",
    tags=["Regions"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "",
    response_model=list[RegionSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.REGION)],
)
async def get_regions(
    service: Annotated[RegionService, Depends(get_region_service)],
    name: str | None = None,
    is_active: bool | None = None,
    sort: str | None = Query(None, description='JSON: {"field": "asc|desc"}'),
):
    return await service.get_regions(name=name, is_active=is_active, sort=sort)


@router.get(
    "/{region_id}",
    response_model=RegionSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.REGION)],
)
async def get_region(
    record: RegionSchema = Depends(region_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[RegionSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.REGION)],
)
async def create_region(
    region_in: RegionCreate,
    service: Annotated[RegionService, Depends(get_region_service)],
):
    return await service.create_region(region_in)


@router.patch(
    "/{region_id}",
    response_model=MutationResponse[RegionSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.REGION)],
)
async def update_region(
    region_update: RegionUpdate,
    record: RegionSchema = Depends(region_by_id),
    service: Annotated[RegionService, Depends(get_region_service)] = None,
):
    return await service.update_region(record.id, region_update)


@router.post(
    "/{region_id}/move",
    response_model=MutationResponse[RegionSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.REGION)],
)
async def move_region(
    region_id: int,
    body: RegionMove,
    service: Annotated[RegionService, Depends(get_region_service)],
):
    """Move a region up/down (gap-10 renumbering, server-side reorder)."""
    return await service.move_region(region_id, body.direction)


@router.delete(
    "/{region_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.REGION)],
)
async def delete_region(
    region_id: int,
    service: Annotated[RegionService, Depends(get_region_service)],
):
    await service.delete_region(region_id)
