from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, Query, status
from fastapi.security import HTTPBearer

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.talent_audit_job.talent_audit_job_dependencies import (
    get_talent_audit_job_service,
    talent_audit_job_by_id,
)
from backend.api_v1.talent_audit_job.talent_audit_job_schema import (
    TalentAuditJob as TalentAuditJobSchema,
    TalentAuditJobCreate,
    TalentAuditJobUpdate,
)
from backend.api_v1.talent_audit_job.talent_audit_job_service import TalentAuditJobService

router = APIRouter(
    prefix="/talent_audit_jobs",
    tags=["Talent Audit Jobs"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get("", response_model=List[TalentAuditJobSchema])
async def get_talent_audit_jobs(
    service: Annotated[TalentAuditJobService, Depends(get_talent_audit_job_service)],
    sort: Optional[str] = Query(
        None,
        description='JSON for sorting: {"field": "asc|desc"} or [{"field1": "asc"}, "field2"]',
    ),
):
    return await service.get_talent_audit_jobs(sort=sort)


# Static path before dynamic
@router.get("/by_talent_audit/{talent_audit_id}", response_model=List[TalentAuditJobSchema])
async def get_talent_audit_jobs_by_audit(
    talent_audit_id: int,
    service: Annotated[TalentAuditJobService, Depends(get_talent_audit_job_service)],
):
    return await service.get_by_talent_audit_id(talent_audit_id)


@router.get("/{talent_audit_job_id}", response_model=TalentAuditJobSchema)
async def get_talent_audit_job(
    record: TalentAuditJobSchema = Depends(talent_audit_job_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[TalentAuditJobSchema],
    status_code=status.HTTP_201_CREATED,
)
async def create_talent_audit_job(
    job_in: TalentAuditJobCreate,
    service: Annotated[TalentAuditJobService, Depends(get_talent_audit_job_service)],
):
    return await service.create_talent_audit_job(job_in)


@router.patch(
    "/{talent_audit_job_id}",
    response_model=MutationResponse[TalentAuditJobSchema],
)
async def update_talent_audit_job(
    job_update: TalentAuditJobUpdate,
    record: TalentAuditJobSchema = Depends(talent_audit_job_by_id),
    service: Annotated[TalentAuditJobService, Depends(get_talent_audit_job_service)] = None,
):
    return await service.update_talent_audit_job(record.id, job_update)


@router.delete("/{talent_audit_job_id}", status_code=status.HTTP_200_OK)
async def delete_talent_audit_job(
    talent_audit_job_id: int,
    service: Annotated[TalentAuditJobService, Depends(get_talent_audit_job_service)],
):
    await service.delete_talent_audit_job(talent_audit_job_id)
