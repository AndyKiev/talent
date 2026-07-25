from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.security import HTTPBearer

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.department_region_link.department_region_link_dependencies import (
    department_region_link_by_id,
    get_department_region_link_service,
)
from backend.api_v1.department_region_link.department_region_link_schema import (
    DepartmentRegionLink as DepartmentRegionLinkSchema,
)
from backend.api_v1.department_region_link.department_region_link_schema import (
    DepartmentRegionLinkCreate,
    DepartmentRegionLinkUpdate,
)
from backend.api_v1.department_region_link.department_region_link_service import (
    DepartmentRegionLinkService,
)
from backend.auth.guards import Guard
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/department_region_links",
    tags=["Department–Region Links"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "",
    response_model=list[DepartmentRegionLinkSchema],
    dependencies=[
        Guard(OperationVerb.VIEW, EssenceName.DEPARTMENT, EssenceName.REGION)
    ],
)
async def get_department_region_links(
    service: Annotated[
        DepartmentRegionLinkService, Depends(get_department_region_link_service)
    ],
    department_id: int | None = None,
    region_id: int | None = None,
    is_active: bool | None = None,
    sort: str | None = Query(None, description='JSON: {"field": "asc|desc"}'),
):
    """List links. Optionally filter by ?department_id=, ?region_id=, or ?is_active=."""
    return await service.get_links(
        department_id=department_id,
        region_id=region_id,
        is_active=is_active,
        sort=sort,
    )


@router.get(
    "/by_department/{department_id}",
    response_model=DepartmentRegionLinkSchema,
    dependencies=[
        Guard(OperationVerb.VIEW, EssenceName.DEPARTMENT, EssenceName.REGION)
    ],
)
async def get_link_by_department(
    department_id: int,
    service: Annotated[
        DepartmentRegionLinkService, Depends(get_department_region_link_service)
    ],
):
    """Fetch the single region link for a department (one-to-one)."""
    return await service.get_by_department(department_id)


@router.get(
    "/{department_region_link_id}",
    response_model=DepartmentRegionLinkSchema,
    dependencies=[
        Guard(OperationVerb.VIEW, EssenceName.DEPARTMENT, EssenceName.REGION)
    ],
)
async def get_department_region_link(
    record: DepartmentRegionLinkSchema = Depends(department_region_link_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[DepartmentRegionLinkSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Guard(OperationVerb.LINK, EssenceName.DEPARTMENT, EssenceName.REGION)
    ],
)
async def create_department_region_link(
    link_in: DepartmentRegionLinkCreate,
    service: Annotated[
        DepartmentRegionLinkService, Depends(get_department_region_link_service)
    ],
):
    """
    Assign a region to a department.
    Department must be of category board, store, or directorate,
    and must not already have a region (one-to-one).
    """
    return await service.create_link(link_in)


@router.patch(
    "/{department_region_link_id}",
    response_model=MutationResponse[DepartmentRegionLinkSchema],
    dependencies=[
        Guard(OperationVerb.LINK, EssenceName.DEPARTMENT, EssenceName.REGION)
    ],
)
async def update_department_region_link(
    link_update: DepartmentRegionLinkUpdate,
    record: DepartmentRegionLinkSchema = Depends(department_region_link_by_id),
    service: Annotated[
        DepartmentRegionLinkService, Depends(get_department_region_link_service)
    ] = None,
):
    """Re-point a department to a different region or toggle is_active."""
    return await service.update_link(record.id, link_update)


@router.delete(
    "/{department_region_link_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[
        Guard(OperationVerb.LINK, EssenceName.DEPARTMENT, EssenceName.REGION)
    ],
)
async def delete_department_region_link(
    department_region_link_id: int,
    service: Annotated[
        DepartmentRegionLinkService, Depends(get_department_region_link_service)
    ],
):
    """Unlink a department from its region."""
    await service.delete_link(department_region_link_id)
