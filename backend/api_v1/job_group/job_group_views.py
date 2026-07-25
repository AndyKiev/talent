from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.security import HTTPBearer

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.job_group.job_group_dependencies import (
    get_job_group_service,
    job_group_by_id,
)
from backend.api_v1.job_group.job_group_schema import (
    JobGroup as JobGroupSchema,
)
from backend.api_v1.job_group.job_group_schema import (
    JobGroupCreate,
    JobGroupUpdate,
)
from backend.api_v1.job_group.job_group_service import JobGroupService
from backend.auth.guards import Guard
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/job_groups",
    tags=["Job Groups"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "",
    response_model=list[JobGroupSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.JOB_GROUP)],
)
async def get_job_groups(
    service: Annotated[JobGroupService, Depends(get_job_group_service)],
    job_group_type_id: int | None = Query(
        None, description="Filter job groups by job group type ID"
    ),
):
    return await service.get_job_groups(job_group_type_id=job_group_type_id)


@router.get(
    "/{job_group_id}",
    response_model=JobGroupSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.JOB_GROUP)],
)
async def get_job_group(
    record: JobGroupSchema = Depends(job_group_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[JobGroupSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.JOB_GROUP)],
)
async def create_job_group(
    group_in: JobGroupCreate,
    service: Annotated[JobGroupService, Depends(get_job_group_service)],
):
    return await service.create_job_group(group_in)


@router.patch(
    "/{job_group_id}",
    response_model=MutationResponse[JobGroupSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.JOB_GROUP)],
)
async def update_job_group(
    group_update: JobGroupUpdate,
    record: JobGroupSchema = Depends(job_group_by_id),
    service: Annotated[JobGroupService, Depends(get_job_group_service)] = None,
):
    return await service.update_job_group(record.id, group_update, partial=True)


@router.delete(
    "/{job_group_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.JOB_GROUP)],
)
async def delete_job_group(
    job_group_id: int,
    service: Annotated[JobGroupService, Depends(get_job_group_service)],
):
    await service.delete_job_group(job_group_id)
