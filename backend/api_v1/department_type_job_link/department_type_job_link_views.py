from fastapi import APIRouter, Depends, status, Query
from fastapi.security import HTTPBearer
from typing import Annotated, Optional, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.department_type_job_link.department_type_job_link_schema import (
    DepartmentTypeJobLink as DepartmentTypeJobLinkSchema,
    DepartmentTypeJobLinkCreate,
    DepartmentTypeJobLinkUpdate,
    JobWithLinkId,
)
from backend.api_v1.department_type_job_link.department_type_job_link_dependencies import (
    get_department_type_job_link_service,
    department_type_job_link_by_id,
    department_type_job_link_by_composite_key,
)
from backend.api_v1.department_type_job_link.department_type_job_link_service import (
    DepartmentTypeJobLinkService,
)

router = APIRouter(
    prefix="/department_type_job_links",
    tags=["Department Type–Job Links"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get("", response_model=List[DepartmentTypeJobLinkSchema])
async def get_department_type_job_links(
    service: Annotated[DepartmentTypeJobLinkService, Depends(get_department_type_job_link_service)],
    department_type_id: Optional[int] = None,
    job_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    sort: Optional[str] = Query(None, description='JSON: {"field": "asc|desc"}'),
):
    """
    List links. Optionally filter by ?department_type_id=, ?job_id=, or ?is_active=.
    """
    return await service.get_links(
        department_type_id=department_type_id,
        job_id=job_id,
        is_active=is_active,
        sort=sort,
    )


@router.get("/by_composite_key", response_model=DepartmentTypeJobLinkSchema)
async def get_department_type_job_link_by_composite_key(
    record: DepartmentTypeJobLinkSchema = Depends(department_type_job_link_by_composite_key),
):
    """
    Fetch a single link by its unique (department_type_id, job_id) pair.
    Query params: ?department_type_id=1&job_id=2
    """
    return record


@router.get(
    "/by_department_type/{department_type_id}/jobs",
    response_model=List[JobWithLinkId],
)
async def get_jobs_by_department_type(
    department_type_id: int,
    service: Annotated[DepartmentTypeJobLinkService, Depends(get_department_type_job_link_service)],
    is_active: Optional[bool] = Query(
        None,  # Changed from True to None
        description=(
            "True → only jobs where both the link and the job are active. "
            "False → only inactive links. "
            "None (default) → all links regardless of is_active."
        ),
    ),
):
    """
    Return all Job objects linked to the given department type.
    Each job is enriched with `link_id` and `link_is_active` for use in delete operations.
    Defaults to all links (?is_active=None).
    """
    return await service.get_jobs_by_department_type(
        department_type_id=department_type_id,
        is_active=is_active,
    )

@router.get("/{department_type_job_link_id}", response_model=DepartmentTypeJobLinkSchema)
async def get_department_type_job_link(
    record: DepartmentTypeJobLinkSchema = Depends(department_type_job_link_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[DepartmentTypeJobLinkSchema],
    status_code=status.HTTP_201_CREATED,
)
async def create_department_type_job_link(
    link_in: DepartmentTypeJobLinkCreate,
    service: Annotated[DepartmentTypeJobLinkService, Depends(get_department_type_job_link_service)],
):
    """Link a department type to a job. The (department_type_id, job_id) pair must be unique."""
    return await service.create_link(link_in)


@router.patch(
    "/{department_type_job_link_id}",
    response_model=MutationResponse[DepartmentTypeJobLinkSchema],
)
async def update_department_type_job_link(
    link_update: DepartmentTypeJobLinkUpdate,
    record: DepartmentTypeJobLinkSchema = Depends(department_type_job_link_by_id),
    service: Annotated[
        DepartmentTypeJobLinkService, Depends(get_department_type_job_link_service)
    ] = None,
):
    """Update link attributes (currently: is_active)."""
    return await service.update_link(record.id, link_update)


@router.delete("/{department_type_job_link_id}", status_code=status.HTTP_200_OK)
async def delete_department_type_job_link(
    department_type_job_link_id: int,
    service: Annotated[DepartmentTypeJobLinkService, Depends(get_department_type_job_link_service)],
):
    """Unlink a department type from a job."""
    await service.delete_link(department_type_job_link_id)
