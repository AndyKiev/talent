from typing import Annotated

from fastapi import APIRouter, Depends

from backend.api_v1.recruitment_application_status.recruitment_application_status_dependencies import (
    get_pipeline_status_service,
)
from backend.api_v1.recruitment_application_status.recruitment_application_status_schema import (
    RecruitmentApplicationStatusSchema,
)
from backend.api_v1.recruitment_application_status.recruitment_application_status_service import (
    RecruitmentApplicationStatusService,
)
from backend.auth.guards import Guard
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.utils.enums import EssenceName, OperationVerb

# Read-only: the pipeline stage set is fixed (seeded by migration) and
# transitions are enforced by the pipeline state machine — no mutation endpoints.
router = APIRouter(
    prefix="/recruitment_application_statuses",
    tags=["Pipeline Statuses"],
    dependencies=[Depends(get_current_active_auth_user)],
)


@router.get(
    "",
    response_model=list[RecruitmentApplicationStatusSchema],
    dependencies=[
        Guard(OperationVerb.VIEW, EssenceName.RECRUITMENT_APPLICATION_STATUS)
    ],
)
async def get_recruitment_application_statuses(
    service: Annotated[
        RecruitmentApplicationStatusService, Depends(get_pipeline_status_service)
    ],
):
    return await service.get_recruitment_application_statuses()


@router.get(
    "/{pipeline_status_id}",
    response_model=RecruitmentApplicationStatusSchema,
    dependencies=[
        Guard(OperationVerb.VIEW, EssenceName.RECRUITMENT_APPLICATION_STATUS)
    ],
)
async def get_pipeline_status(
    pipeline_status_id: int,
    service: Annotated[
        RecruitmentApplicationStatusService, Depends(get_pipeline_status_service)
    ],
):
    record = await service.get_by_id(pipeline_status_id)
    return RecruitmentApplicationStatusSchema.model_validate(record)
