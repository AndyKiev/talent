from typing import Annotated, Optional

from fastapi import APIRouter, Depends
from fastapi.security import HTTPBearer

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.job_job_category_link.job_job_category_link_dependencies import (
    get_job_job_category_link_service,
)
from backend.api_v1.job_job_category_link.job_job_category_link_schema import (
    JobJobCategoryClearAllResult,
    JobJobCategoryLinkSet,
)
from backend.api_v1.job_job_category_link.job_job_category_link_schema import (
    JobJobCategoryLink as JobJobCategoryLinkSchema,
)
from backend.api_v1.job_job_category_link.job_job_category_link_service import (
    JobJobCategoryLinkService,
)
from backend.auth.guards import Guard
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/job_job_category_links",
    tags=["Job ↔ Job Category Links"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "/job/{job_id}",
    response_model=Optional[JobJobCategoryLinkSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.JOB)],
)
async def get_link_for_job(
    job_id: int,
    service: Annotated[
        JobJobCategoryLinkService, Depends(get_job_job_category_link_service)
    ],
):
    """Return the job's category link (or null when it has none)."""
    return await service.get_for_job(job_id)


@router.put(
    "/job/{job_id}",
    response_model=MutationResponse[JobJobCategoryLinkSchema],
    dependencies=[Guard(OperationVerb.LINK, EssenceName.JOB)],
)
async def set_category_for_job(
    job_id: int,
    payload: JobJobCategoryLinkSet,
    service: Annotated[
        JobJobCategoryLinkService, Depends(get_job_job_category_link_service)
    ],
):
    """Set (upsert) the single category of a job — replaces any existing link."""
    return await service.set_category_for_job(job_id, payload.job_category_id)


@router.delete(
    "/all",
    response_model=JobJobCategoryClearAllResult,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.JOB)],
)
async def clear_all_links(
    service: Annotated[
        JobJobCategoryLinkService, Depends(get_job_job_category_link_service)
    ],
):
    """Deliberate bulk removal of every job ↔ category link (confirm-gated on FE)."""
    return await service.clear_all()
