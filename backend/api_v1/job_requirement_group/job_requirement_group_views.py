from typing import Annotated

from fastapi import APIRouter, Depends, status

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.job_requirement_group.job_requirement_group_dependencies import (
    get_job_requirement_group_service,
    job_requirement_group_by_id,
)
from backend.api_v1.job_requirement_group.job_requirement_group_schema import (
    JobRequirementGroupCreate,
    JobRequirementGroupSchema,
    JobRequirementGroupUpdate,
)
from backend.api_v1.job_requirement_group.job_requirement_group_service import (
    JobRequirementGroupService,
)
from backend.auth.guards import Guard
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/job_requirement_groups",
    tags=["Job Requirement Groups"],
    dependencies=[Depends(get_current_active_auth_user)],
)


@router.get(
    "",
    response_model=list[JobRequirementGroupSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.JOB_REQUIREMENT)],
)
async def get_job_requirement_groups(
    service: Annotated[
        JobRequirementGroupService, Depends(get_job_requirement_group_service)
    ],
    job_id: int | None = None,
    is_active: bool | None = None,
):
    return await service.get_job_requirement_groups(job_id=job_id, is_active=is_active)


@router.get(
    "/{job_requirement_group_id}",
    response_model=JobRequirementGroupSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.JOB_REQUIREMENT)],
)
async def get_job_requirement_group(
    record: JobRequirementGroupSchema = Depends(job_requirement_group_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[JobRequirementGroupSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.JOB_REQUIREMENT)],
)
async def create_job_requirement_group(
    group_in: JobRequirementGroupCreate,
    service: Annotated[
        JobRequirementGroupService, Depends(get_job_requirement_group_service)
    ],
):
    return await service.create_job_requirement_group(group_in)


@router.patch(
    "/{job_requirement_group_id}",
    response_model=MutationResponse[JobRequirementGroupSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.JOB_REQUIREMENT)],
)
async def update_job_requirement_group(
    group_update: JobRequirementGroupUpdate,
    record: JobRequirementGroupSchema = Depends(job_requirement_group_by_id),
    service: Annotated[
        JobRequirementGroupService, Depends(get_job_requirement_group_service)
    ] = None,
):
    return await service.update_job_requirement_group(record.id, group_update)


@router.delete(
    "/{job_requirement_group_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.JOB_REQUIREMENT)],
)
async def delete_job_requirement_group(
    job_requirement_group_id: int,
    service: Annotated[
        JobRequirementGroupService, Depends(get_job_requirement_group_service)
    ],
):
    await service.delete_job_requirement_group(job_requirement_group_id)
