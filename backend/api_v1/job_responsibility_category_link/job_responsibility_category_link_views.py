from fastapi import APIRouter, Depends, status, Query
from fastapi.security import HTTPBearer
from typing import Annotated, Optional, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.job_responsibility_category_link.job_responsibility_category_link_schema import (
    JobResponsibilityCategoryLink as JobResponsibilityCategoryLinkSchema,
    JobResponsibilityCategoryLinkCreate,
    JobResponsibilityCategoryLinkUpdate,
    ResponsibilityCategoryOption,
)
from backend.api_v1.job_responsibility_category_link.job_responsibility_category_link_dependencies import (
    get_job_responsibility_category_link_service,
    job_responsibility_category_link_by_id,
)
from backend.api_v1.job_responsibility_category_link.job_responsibility_category_link_service import (
    JobResponsibilityCategoryLinkService,
)

router = APIRouter(
    prefix="/job_responsibility_category_links",
    tags=["Job Responsibility Category Links"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get("", response_model=List[JobResponsibilityCategoryLinkSchema])
async def get_links(
    service: Annotated[
        JobResponsibilityCategoryLinkService,
        Depends(get_job_responsibility_category_link_service),
    ],
    job_id: Optional[int] = None,
    department_category_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    sort: Optional[str] = Query(None, description='JSON: {"field": "asc|desc"}'),
):
    """List links. Filter by ?job_id=, ?department_category_id=, ?is_active=."""
    return await service.get_links(
        job_id=job_id,
        department_category_id=department_category_id,
        is_active=is_active,
        sort=sort,
    )


@router.get(
    "/by_job/{job_id}/categories",
    response_model=List[ResponsibilityCategoryOption],
)
async def get_categories_for_job(
    job_id: int,
    service: Annotated[
        JobResponsibilityCategoryLinkService,
        Depends(get_job_responsibility_category_link_service),
    ],
):
    """
    Department categories valid as responsibility departments for this job.
    Falls back to is_main=false categories when the job has no explicit links.
    Drives the RESPONSIBILITY_DEPTS_CHANGE picker.
    """
    return await service.get_categories_for_job(job_id)


@router.get(
    "/{job_responsibility_category_link_id}",
    response_model=JobResponsibilityCategoryLinkSchema,
)
async def get_link(
    record: JobResponsibilityCategoryLinkSchema = Depends(
        job_responsibility_category_link_by_id
    ),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[JobResponsibilityCategoryLinkSchema],
    status_code=status.HTTP_201_CREATED,
)
async def create_link(
    link_in: JobResponsibilityCategoryLinkCreate,
    service: Annotated[
        JobResponsibilityCategoryLinkService,
        Depends(get_job_responsibility_category_link_service),
    ],
):
    return await service.create_link(link_in)


@router.patch(
    "/{job_responsibility_category_link_id}",
    response_model=MutationResponse[JobResponsibilityCategoryLinkSchema],
)
async def update_link(
    link_update: JobResponsibilityCategoryLinkUpdate,
    record: JobResponsibilityCategoryLinkSchema = Depends(
        job_responsibility_category_link_by_id
    ),
    service: Annotated[
        JobResponsibilityCategoryLinkService,
        Depends(get_job_responsibility_category_link_service),
    ] = None,
):
    return await service.update_link(record.id, link_update)


@router.delete(
    "/{job_responsibility_category_link_id}",
    status_code=status.HTTP_200_OK,
)
async def delete_link(
    job_responsibility_category_link_id: int,
    service: Annotated[
        JobResponsibilityCategoryLinkService,
        Depends(get_job_responsibility_category_link_service),
    ],
):
    await service.delete_link(job_responsibility_category_link_id)
