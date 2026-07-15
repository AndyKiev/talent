from fastapi import APIRouter, Depends
from typing import Annotated, List

from backend.api_v1.pipeline_status.pipeline_status_schema import PipelineStatusSchema
from backend.api_v1.pipeline_status.pipeline_status_dependencies import (
    get_pipeline_status_service,
)
from backend.api_v1.pipeline_status.pipeline_status_service import PipelineStatusService
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.auth.guards import Guard
from backend.utils.enums import OperationVerb, EssenceName

# Read-only: the pipeline stage set is fixed (seeded by migration) and
# transitions are enforced by the pipeline state machine — no mutation endpoints.
router = APIRouter(
    prefix="/pipeline_statuses",
    tags=["Pipeline Statuses"],
    dependencies=[Depends(get_current_active_auth_user)],
)


@router.get(
    "",
    response_model=List[PipelineStatusSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.PIPELINE_STATUS)],
)
async def get_pipeline_statuses(
    service: Annotated[PipelineStatusService, Depends(get_pipeline_status_service)],
):
    return await service.get_pipeline_statuses()


@router.get(
    "/{pipeline_status_id}",
    response_model=PipelineStatusSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.PIPELINE_STATUS)],
)
async def get_pipeline_status(
    pipeline_status_id: int,
    service: Annotated[PipelineStatusService, Depends(get_pipeline_status_service)],
):
    record = await service.get_by_id(pipeline_status_id)
    return PipelineStatusSchema.model_validate(record)
