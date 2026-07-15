from fastapi import APIRouter, Depends, status
from typing import Annotated, Optional, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.job_requirement_item.job_requirement_item_schema import (
    JobRequirementItemSchema,
    JobRequirementItemCreate,
    JobRequirementItemUpdate,
)
from backend.api_v1.job_requirement_item.job_requirement_item_dependencies import (
    get_job_requirement_item_service,
    job_requirement_item_by_id,
)
from backend.api_v1.job_requirement_item.job_requirement_item_service import (
    JobRequirementItemService,
)
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.auth.guards import Guard
from backend.utils.enums import OperationVerb, EssenceName

router = APIRouter(
    prefix="/job_requirement_items",
    tags=["Job Requirement Items"],
    dependencies=[Depends(get_current_active_auth_user)],
)


@router.get(
    "",
    response_model=List[JobRequirementItemSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.JOB_REQUIREMENT)],
)
async def get_job_requirement_items(
    service: Annotated[
        JobRequirementItemService, Depends(get_job_requirement_item_service)
    ],
    group_id: Optional[int] = None,
):
    return await service.get_job_requirement_items(group_id=group_id)


@router.get(
    "/{job_requirement_item_id}",
    response_model=JobRequirementItemSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.JOB_REQUIREMENT)],
)
async def get_job_requirement_item(
    record: JobRequirementItemSchema = Depends(job_requirement_item_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[JobRequirementItemSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.JOB_REQUIREMENT)],
)
async def create_job_requirement_item(
    item_in: JobRequirementItemCreate,
    service: Annotated[
        JobRequirementItemService, Depends(get_job_requirement_item_service)
    ],
):
    return await service.create_job_requirement_item(item_in)


@router.patch(
    "/{job_requirement_item_id}",
    response_model=MutationResponse[JobRequirementItemSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.JOB_REQUIREMENT)],
)
async def update_job_requirement_item(
    item_update: JobRequirementItemUpdate,
    record: JobRequirementItemSchema = Depends(job_requirement_item_by_id),
    service: Annotated[
        JobRequirementItemService, Depends(get_job_requirement_item_service)
    ] = None,
):
    return await service.update_job_requirement_item(record.id, item_update)


@router.delete(
    "/{job_requirement_item_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.JOB_REQUIREMENT)],
)
async def delete_job_requirement_item(
    job_requirement_item_id: int,
    service: Annotated[
        JobRequirementItemService, Depends(get_job_requirement_item_service)
    ],
):
    await service.delete_job_requirement_item(job_requirement_item_id)
