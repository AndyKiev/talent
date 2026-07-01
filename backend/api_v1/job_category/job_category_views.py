from fastapi import APIRouter, Depends, status, Query
from fastapi.security import HTTPBearer
from typing import Annotated, Optional, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.job_category.job_category_schema import (
    JobCategory as JobCategorySchema,
    JobCategoryCreate,
    JobCategoryUpdate,
)
from backend.api_v1.job_category.job_category_dependencies import (
    get_job_category_service,
    job_category_by_id,
)
from backend.api_v1.job_category.job_category_service import JobCategoryService
from backend.auth.guards import Guard
from backend.utils.enums import OperationVerb, EssenceName

router = APIRouter(
    prefix="/job_categories",
    tags=["Job Categories"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "",
    response_model=List[JobCategorySchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.JOB)],
)
async def get_job_categories(
    service: Annotated[JobCategoryService, Depends(get_job_category_service)],
    sort: Optional[str] = Query(None, description='JSON: {"field": "asc|desc"}'),
):
    return await service.get_job_categories(sort=sort)


@router.get(
    "/{job_category_id}",
    response_model=JobCategorySchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.JOB)],
)
async def get_job_category(
    record: JobCategorySchema = Depends(job_category_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[JobCategorySchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.JOB)],
)
async def create_job_category(
    category_in: JobCategoryCreate,
    service: Annotated[JobCategoryService, Depends(get_job_category_service)],
):
    return await service.create_job_category(category_in)


@router.patch(
    "/{job_category_id}",
    response_model=MutationResponse[JobCategorySchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.JOB)],
)
async def update_job_category(
    category_update: JobCategoryUpdate,
    record: JobCategorySchema = Depends(job_category_by_id),
    service: Annotated[JobCategoryService, Depends(get_job_category_service)] = None,
):
    return await service.update_job_category(record.id, category_update)


@router.delete(
    "/{job_category_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.JOB)],
)
async def delete_job_category(
    job_category_id: int,
    service: Annotated[JobCategoryService, Depends(get_job_category_service)],
):
    await service.delete_job_category(job_category_id)
