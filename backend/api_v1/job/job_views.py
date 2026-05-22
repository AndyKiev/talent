from fastapi import APIRouter, Depends, status, Query
from fastapi.security import HTTPBearer
from typing import Annotated, Optional, List
from pydantic import BaseModel

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.job.job_schema import Job as JobSchema, JobCreate, JobUpdate
from backend.api_v1.job.job_dependencies import get_job_service, job_by_id
from backend.api_v1.job.job_service import JobService
from backend.api_v1.employee.employee_service import SyncJobResult

router = APIRouter(
    prefix="/jobs",
    tags=["Jobs"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get("", response_model=List[JobSchema])
async def get_jobs(
    service: Annotated[JobService, Depends(get_job_service)],
    name: Optional[str] = None,
    sort: Optional[str] = Query(
        None,
        description='JSON for sorting: {"field": "asc|desc"} or [{"field1": "asc"}, "field2"]',
    ),
):
    return await service.get_jobs(name=name, sort=sort)


@router.get("/{job_id}", response_model=JobSchema)
async def get_job(job: JobSchema = Depends(job_by_id)):
    return job


@router.post(
    "",
    response_model=MutationResponse[JobSchema],
    status_code=status.HTTP_201_CREATED,
)
async def create_job(
    job_in: JobCreate,
    service: Annotated[JobService, Depends(get_job_service)],
):
    return await service.create_job(job_in)


@router.patch("/{job_id}", response_model=MutationResponse[JobSchema])
async def update_job(
    job_update: JobUpdate,
    job: JobSchema = Depends(job_by_id),
    service: Annotated[JobService, Depends(get_job_service)] = None,
):
    return await service.update_job(job.id, job_update)


@router.delete("/{job_id}", status_code=status.HTTP_200_OK)
async def delete_job(
    job_id: int,
    service: Annotated[JobService, Depends(get_job_service)],
):
    await service.delete_job(job_id)


@router.get("/{job_id}/groups", response_model=List[str])
async def get_job_groups(job: JobSchema = Depends(job_by_id)):
    return job.groups


@router.post("/{job_id}/groups/{user_group_id}", response_model=JobSchema)
async def add_job_to_group(
    user_group_id: int,
    job: JobSchema = Depends(job_by_id),
    service: JobService = Depends(get_job_service),
):
    return await service.add_to_group(job.id, user_group_id)


@router.delete("/{job_id}/groups/{user_group_id}", response_model=JobSchema)
async def remove_job_from_group(
    user_group_id: int,
    job: JobSchema = Depends(job_by_id),
    service: JobService = Depends(get_job_service),
):
    return await service.remove_from_group(job.id, user_group_id)


class JobGroupsUpdate(BaseModel):
    group_ids: List[int]


@router.put("/{job_id}/groups", response_model=JobSchema)
async def set_job_groups(
    groups_update: JobGroupsUpdate,
    job: JobSchema = Depends(job_by_id),
    service: JobService = Depends(get_job_service),
):
    return await service.set_groups(job.id, groups_update.group_ids)


@router.post(
    "/{job_id}/sync_user_groups",
    response_model=SyncJobResult,
    summary="Sync groups for all users of a job",
    description=(
        "Full two-way sync: loops through every employee assigned to this job and "
        "makes their group memberships exactly match the job's groups — "
        "adding missing table_relationship_links and removing stale ones."
    ),
)
async def sync_job_users_groups(
    job: JobSchema = Depends(job_by_id),
    service: JobService = Depends(get_job_service),
) -> SyncJobResult:
    return await service.sync_job_users_groups(job.id)
