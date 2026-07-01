from fastapi import APIRouter, Depends
from fastapi.security import HTTPBearer
from typing import Annotated, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.training_type_job_link.training_type_job_link_schema import (
    TrainingTypeJobLink as TrainingTypeJobLinkSchema,
    TrainingTypeJobLinkBulkSet,
    TrainingTypeJobLinkBulkSetForJob,
)
from backend.api_v1.training_type_job_link.training_type_job_link_dependencies import (
    get_training_type_job_link_service,
)
from backend.api_v1.training_type_job_link.training_type_job_link_service import (
    TrainingTypeJobLinkService,
)
from backend.auth.guards import Guard
from backend.utils.enums import OperationVerb, EssenceName

router = APIRouter(
    prefix="/training_type_job_links",
    tags=["Training Type ↔ Job Links"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "/training_type/{training_type_id}",
    response_model=List[TrainingTypeJobLinkSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.TRAINING_TYPE)],
)
async def get_links_for_training_type(
    training_type_id: int,
    service: Annotated[
        TrainingTypeJobLinkService, Depends(get_training_type_job_link_service)
    ],
):
    """Return all job links for a given training type."""
    return await service.get_links_for_training_type(training_type_id)


@router.get(
    "/job/{job_id}",
    response_model=List[TrainingTypeJobLinkSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.JOB)],
)
async def get_links_for_job(
    job_id: int,
    service: Annotated[
        TrainingTypeJobLinkService, Depends(get_training_type_job_link_service)
    ],
):
    """Return all training types that recommend a given job."""
    return await service.get_links_for_job(job_id)


@router.put(
    "/training_type/{training_type_id}",
    response_model=MutationResponse[List[TrainingTypeJobLinkSchema]],
    dependencies=[Guard(OperationVerb.LINK, EssenceName.TRAINING_TYPE)],
)
async def set_links(
    training_type_id: int,
    payload: TrainingTypeJobLinkBulkSet,
    service: Annotated[
        TrainingTypeJobLinkService, Depends(get_training_type_job_link_service)
    ],
):
    """Replace all job links for a training type atomically."""
    return await service.set_links(training_type_id, payload)


@router.put(
    "/job/{job_id}",
    response_model=MutationResponse[List[TrainingTypeJobLinkSchema]],
    dependencies=[Guard(OperationVerb.LINK, EssenceName.JOB)],
)
async def set_links_for_job(
    job_id: int,
    payload: TrainingTypeJobLinkBulkSetForJob,
    service: Annotated[
        TrainingTypeJobLinkService, Depends(get_training_type_job_link_service)
    ],
):
    """Replace all training types recommending a job atomically (reverse side)."""
    return await service.set_links_for_job(job_id, payload)
