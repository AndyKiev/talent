from fastapi import APIRouter, Depends, status, Query
from fastapi.security import HTTPBearer
from typing import Annotated, Optional, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.job_group_type.job_group_type_schema import (
    JobGroupType as JobGroupTypeSchema,
    JobGroupTypeCreate,
    JobGroupTypeUpdate,
)
from backend.api_v1.job_group_type.job_group_type_dependencies import (
    get_job_group_type_service,
    job_group_type_by_id,
)
from backend.api_v1.job_group_type.job_group_type_service import JobGroupTypeService

router = APIRouter(
    prefix="/job_group_types",
    tags=["Job Group Types"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get("", response_model=List[JobGroupTypeSchema])
async def get_job_group_types(
    service: Annotated[JobGroupTypeService, Depends(get_job_group_type_service)],
    name: Optional[str] = None,
    sort: Optional[str] = Query(
        None,
        description='JSON for sorting: {"field": "asc|desc"}',
    ),
):
    return await service.get_job_group_types(name=name, sort=sort)


@router.get("/{job_group_type_id}", response_model=JobGroupTypeSchema)
async def get_job_group_type(
    record: JobGroupTypeSchema = Depends(job_group_type_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[JobGroupTypeSchema],
    status_code=status.HTTP_201_CREATED,
)
async def create_job_group_type(
    type_in: JobGroupTypeCreate,
    service: Annotated[JobGroupTypeService, Depends(get_job_group_type_service)],
):
    return await service.create_job_group_type(type_in)


@router.patch(
    "/{job_group_type_id}",
    response_model=MutationResponse[JobGroupTypeSchema],
)
async def update_job_group_type(
    type_update: JobGroupTypeUpdate,
    record: JobGroupTypeSchema = Depends(job_group_type_by_id),
    service: Annotated[JobGroupTypeService, Depends(get_job_group_type_service)] = None,
):
    return await service.update_job_group_type(record.id, type_update)


@router.delete("/{job_group_type_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job_group_type(
    job_group_type_id: int,
    service: Annotated[JobGroupTypeService, Depends(get_job_group_type_service)],
):
    await service.delete_job_group_type(job_group_type_id)
