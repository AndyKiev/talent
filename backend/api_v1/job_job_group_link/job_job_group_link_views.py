from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPBearer

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.job_job_group_link.job_job_group_link_dependencies import (
    get_job_job_group_link_service,
)
from backend.api_v1.job_job_group_link.job_job_group_link_schema import (
    JobJobGroupLink as JobJobGroupLinkSchema,
)
from backend.api_v1.job_job_group_link.job_job_group_link_schema import (
    JobJobGroupLinkBulkSet,
    JobJobGroupLinkCreate,
)
from backend.api_v1.job_job_group_link.job_job_group_link_service import (
    JobJobGroupLinkService,
)
from backend.auth.guards import Guard
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/job_job_group_links",
    tags=["Job ↔ Job Group Links"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "/job/{job_id}",
    response_model=list[JobJobGroupLinkSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.JOB, EssenceName.JOB_GROUP)],
)
async def get_links_for_job(
    job_id: int,
    service: Annotated[JobJobGroupLinkService, Depends(get_job_job_group_link_service)],
):
    """Return all job-group links for a given job."""
    return await service.get_links_for_job(job_id)


@router.get(
    "/job/{job_id}/group/{job_group_id}",
    response_model=JobJobGroupLinkSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.JOB, EssenceName.JOB_GROUP)],
)
async def get_link(
    job_id: int,
    job_group_id: int,
    service: Annotated[JobJobGroupLinkService, Depends(get_job_job_group_link_service)],
):
    """Return a specific job ↔ job-group link."""
    return await service.get_link(job_id, job_group_id)


@router.post(
    "",
    response_model=MutationResponse[JobJobGroupLinkSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.LINK, EssenceName.JOB, EssenceName.JOB_GROUP)],
)
async def add_link(
    payload: JobJobGroupLinkCreate,
    service: Annotated[JobJobGroupLinkService, Depends(get_job_job_group_link_service)],
):
    """
    Link a job to a job group.

    Raises **JobAlreadyInJobGroup** if the link already exists.
    Raises **JobGroupTypeSingletonViolation** if the group's type has
    `allow_multiple=False` and the job already belongs to another group of that type.
    """
    return await service.add_link(payload)


@router.delete(
    "/job/{job_id}/group/{job_group_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.LINK, EssenceName.JOB, EssenceName.JOB_GROUP)],
)
async def remove_link(
    job_id: int,
    job_group_id: int,
    service: Annotated[JobJobGroupLinkService, Depends(get_job_job_group_link_service)],
):
    """Remove a job ↔ job-group link."""
    await service.remove_link(job_id, job_group_id)


@router.put(
    "/job/{job_id}",
    response_model=list[JobJobGroupLinkSchema],
    dependencies=[Guard(OperationVerb.LINK, EssenceName.JOB, EssenceName.JOB_GROUP)],
)
async def set_links(
    job_id: int,
    payload: JobJobGroupLinkBulkSet,
    service: Annotated[JobJobGroupLinkService, Depends(get_job_job_group_link_service)],
):
    """
    Replace all job-group links for a job atomically.

    Validates singleton constraints across the entire incoming set before
    committing — if any type with `allow_multiple=False` appears more than
    once in `job_group_ids`, the whole request is rejected.
    """
    return await service.set_links(job_id, payload)
