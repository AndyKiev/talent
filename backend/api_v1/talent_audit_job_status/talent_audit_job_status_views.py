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
from backend.auth.guards import Guard
from backend.utils.enums import OperationVerb, EssenceName

router = APIRouter(
    prefix="/talent_audit_job_statuses",
    tags=["Talent Audit Job Statuses"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "",
    response_model=List[TalentAuditJobStatusSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.TALENT_AUDIT_JOB_STATUS)],
)
async def get_talent_audit_job_statuses(
    service: Annotated[
        TalentAuditJobStatusService, Depends(get_talent_audit_job_status_service)
    ],
    name: Optional[str] = None,
    sort: Optional[str] = Query(
        None,
        description='JSON for sorting: {"field": "asc|desc"} or [{"field1": "asc"}, "field2"]',
    ),
):
    return await service.get_talent_audit_job_statuses(name=name, sort=sort)


@router.get(
    "/{talent_audit_job_status_id}",
    response_model=TalentAuditJobStatusSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.TALENT_AUDIT_JOB_STATUS)],
)
async def get_talent_audit_job_status(
    record: TalentAuditJobStatusSchema = Depends(talent_audit_job_status_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[TalentAuditJobStatusSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.TALENT_AUDIT_JOB_STATUS)],
)
async def create_talent_audit_job_status(
    status_in: TalentAuditJobStatusCreate,
    service: Annotated[
        TalentAuditJobStatusService, Depends(get_talent_audit_job_status_service)
    ],
):
    return await service.create_talent_audit_job_status(status_in)


@router.patch(
    "/{talent_audit_job_status_id}",
    response_model=MutationResponse[TalentAuditJobStatusSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.TALENT_AUDIT_JOB_STATUS)],
)
async def update_talent_audit_job_status(
    status_update: TalentAuditJobStatusUpdate,
    record: TalentAuditJobStatusSchema = Depends(talent_audit_job_status_by_id),
    service: Annotated[
        TalentAuditJobStatusService, Depends(get_talent_audit_job_status_service)
    ] = None,
):
    return await service.update_talent_audit_job_status(record.id, status_update)


@router.delete(
    "/{talent_audit_job_status_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.TALENT_AUDIT_JOB_STATUS)],
)
async def delete_talent_audit_job_status(
    talent_audit_job_status_id: int,
    service: Annotated[
        TalentAuditJobStatusService, Depends(get_talent_audit_job_status_service)
    ],
):
    await service.delete_talent_audit_job_status(talent_audit_job_status_id)
