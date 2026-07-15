from fastapi import APIRouter, Depends
from typing import Annotated, List

from backend.api_v1.recruitment_task_status.recruitment_task_status_schema import (
    RecruitmentTaskStatusSchema,
)
from backend.api_v1.recruitment_task_status.recruitment_task_status_dependencies import (
    get_recruitment_task_status_service,
)
from backend.api_v1.recruitment_task_status.recruitment_task_status_service import (
    RecruitmentTaskStatusService,
)
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.auth.guards import Guard
from backend.utils.enums import OperationVerb, EssenceName

# Read-only: the status set is fixed (seeded by migration) and transitions are
# enforced by the recruitment task state machine — no mutation endpoints.
router = APIRouter(
    prefix="/recruitment_task_statuses",
    tags=["Recruitment Task Statuses"],
    dependencies=[Depends(get_current_active_auth_user)],
)


@router.get(
    "",
    response_model=List[RecruitmentTaskStatusSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.RECRUITMENT_TASK_STATUS)],
)
async def get_recruitment_task_statuses(
    service: Annotated[
        RecruitmentTaskStatusService, Depends(get_recruitment_task_status_service)
    ],
):
    return await service.get_recruitment_task_statuses()


@router.get(
    "/{recruitment_task_status_id}",
    response_model=RecruitmentTaskStatusSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.RECRUITMENT_TASK_STATUS)],
)
async def get_recruitment_task_status(
    recruitment_task_status_id: int,
    service: Annotated[
        RecruitmentTaskStatusService, Depends(get_recruitment_task_status_service)
    ],
):
    record = await service.get_by_id(recruitment_task_status_id)
    return RecruitmentTaskStatusSchema.model_validate(record)
