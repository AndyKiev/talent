from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, Query, status
from fastapi.security import HTTPBearer

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.talent_audit_job_status.talent_audit_job_status_dependencies import (
    get_talent_audit_job_status_service,
    talent_audit_job_status_by_id,
)
from backend.api_v1.talent_audit_job_status.talent_audit_job_status_schema import (
    TalentAuditJobStatus as TalentAuditJobStatusSchema,
    TalentAuditJobStatusCreate,
    TalentAuditJobStatusUpdate,
)
from backend.api_v1.talent_audit_job_status.talent_audit_job_status_service import (
    TalentAuditJobStatusService,
)

router = APIRouter(
    prefix="/talent_audit_job_statuses",
    tags=["Talent Audit Job Statuses"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get("", response_model=List[TalentAuditJobStatusSchema])
async def get_talent_audit_job_statuses(
    service: Annotated[TalentAuditJobStatusService, Depends(get_talent_audit_job_status_service)],
    name: Optional[str] = None,
    sort: Optional[str] = Query(
        None,
        description='JSON for sorting: {"field": "asc|desc"} or [{"field1": "asc"}, "field2"]',
    ),
):
    return await service.get_talent_audit_job_statuses(name=name, sort=sort)


@router.get("/{talent_audit_job_status_id}", response_model=TalentAuditJobStatusSchema)
async def get_talent_audit_job_status(
    record: TalentAuditJobStatusSchema = Depends(talent_audit_job_status_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[TalentAuditJobStatusSchema],
    status_code=status.HTTP_201_CREATED,
)
async def create_talent_audit_job_status(
    status_in: TalentAuditJobStatusCreate,
    service: Annotated[TalentAuditJobStatusService, Depends(get_talent_audit_job_status_service)],
):
    return await service.create_talent_audit_job_status(status_in)


@router.patch(
    "/{talent_audit_job_status_id}",
    response_model=MutationResponse[TalentAuditJobStatusSchema],
)
async def update_talent_audit_job_status(
    status_update: TalentAuditJobStatusUpdate,
    record: TalentAuditJobStatusSchema = Depends(talent_audit_job_status_by_id),
    service: Annotated[
        TalentAuditJobStatusService, Depends(get_talent_audit_job_status_service)
    ] = None,
):
    return await service.update_talent_audit_job_status(record.id, status_update)


@router.delete("/{talent_audit_job_status_id}", status_code=status.HTTP_200_OK)
async def delete_talent_audit_job_status(
    talent_audit_job_status_id: int,
    service: Annotated[TalentAuditJobStatusService, Depends(get_talent_audit_job_status_service)],
):
    await service.delete_talent_audit_job_status(talent_audit_job_status_id)
