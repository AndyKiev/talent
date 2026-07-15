from fastapi import APIRouter, Depends, status, Query
from typing import Annotated, Optional, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.recruitment_task.recruitment_task_schema import (
    RecruitmentTaskSchema,
    RecruitmentTaskCreate,
    RecruitmentTaskUpdate,
    RecruitmentTaskStatusChange,
)
from backend.api_v1.recruitment_task.recruitment_task_dependencies import (
    get_recruitment_task_service,
    recruitment_task_by_id,
)
from backend.api_v1.recruitment_task.recruitment_task_service import (
    RecruitmentTaskService,
)
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.auth.guards import Guard
from backend.utils.enums import OperationVerb, EssenceName

router = APIRouter(
    prefix="/recruitment_tasks",
    tags=["Recruitment Tasks"],
    dependencies=[Depends(get_current_active_auth_user)],
)


@router.get(
    "",
    response_model=List[RecruitmentTaskSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.RECRUITMENT_TASK)],
)
async def get_recruitment_tasks(
    service: Annotated[RecruitmentTaskService, Depends(get_recruitment_task_service)],
    status_id: Optional[int] = None,
    job_id: Optional[int] = None,
    sort: Optional[str] = Query(None),
):
    return await service.get_recruitment_tasks(
        status_id=status_id, job_id=job_id, sort=sort
    )


@router.get(
    "/{recruitment_task_id}",
    response_model=RecruitmentTaskSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.RECRUITMENT_TASK)],
)
async def get_recruitment_task(
    recruitment_task_id: int,
    service: Annotated[RecruitmentTaskService, Depends(get_recruitment_task_service)],
):
    return await service.get_recruitment_task_detail(recruitment_task_id)


@router.post(
    "",
    response_model=MutationResponse[RecruitmentTaskSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.RECRUITMENT_TASK)],
)
async def create_recruitment_task(
    task_in: RecruitmentTaskCreate,
    service: Annotated[RecruitmentTaskService, Depends(get_recruitment_task_service)],
):
    return await service.create_recruitment_task(task_in)


@router.patch(
    "/{recruitment_task_id}",
    response_model=MutationResponse[RecruitmentTaskSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.RECRUITMENT_TASK)],
)
async def update_recruitment_task(
    task_update: RecruitmentTaskUpdate,
    record: RecruitmentTaskSchema = Depends(recruitment_task_by_id),
    service: Annotated[
        RecruitmentTaskService, Depends(get_recruitment_task_service)
    ] = None,
):
    return await service.update_recruitment_task(record.id, task_update)


@router.post(
    "/{recruitment_task_id}/status",
    response_model=MutationResponse[RecruitmentTaskSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.RECRUITMENT_TASK)],
)
async def change_recruitment_task_status(
    status_change: RecruitmentTaskStatusChange,
    record: RecruitmentTaskSchema = Depends(recruitment_task_by_id),
    service: Annotated[
        RecruitmentTaskService, Depends(get_recruitment_task_service)
    ] = None,
):
    return await service.change_status(record.id, status_change.status_key)


@router.delete(
    "/{recruitment_task_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.RECRUITMENT_TASK)],
)
async def delete_recruitment_task(
    recruitment_task_id: int,
    service: Annotated[RecruitmentTaskService, Depends(get_recruitment_task_service)],
):
    await service.delete_recruitment_task(recruitment_task_id)
