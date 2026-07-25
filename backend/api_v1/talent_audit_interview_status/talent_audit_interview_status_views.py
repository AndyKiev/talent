from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.security import HTTPBearer

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.talent_audit_interview_status.talent_audit_interview_status_dependencies import (
    get_talent_audit_interview_status_service,
    talent_audit_interview_status_by_id,
)
from backend.api_v1.talent_audit_interview_status.talent_audit_interview_status_schema import (
    TalentAuditInterviewStatus as TalentAuditInterviewStatusSchema,
)
from backend.api_v1.talent_audit_interview_status.talent_audit_interview_status_schema import (
    TalentAuditInterviewStatusCreate,
    TalentAuditInterviewStatusUpdate,
)
from backend.api_v1.talent_audit_interview_status.talent_audit_interview_status_service import (
    TalentAuditInterviewStatusService,
)
from backend.auth.guards import Guard
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/talent_audit_interview_statuses",
    tags=["Talent Audit Interview Statuses"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "",
    response_model=list[TalentAuditInterviewStatusSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.TALENT_AUDIT_INTERVIEW_STATUS)],
)
async def get_talent_audit_interview_statuses(
    service: Annotated[
        TalentAuditInterviewStatusService,
        Depends(get_talent_audit_interview_status_service),
    ],
    name: str | None = None,
    sort: str | None = Query(
        None,
        description='JSON for sorting: {"field": "asc|desc"} or [{"field1": "asc"}, "field2"]',
    ),
):
    return await service.get_talent_audit_interview_statuses(name=name, sort=sort)


@router.get(
    "/{talent_audit_interview_status_id}",
    response_model=TalentAuditInterviewStatusSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.TALENT_AUDIT_INTERVIEW_STATUS)],
)
async def get_talent_audit_interview_status(
    record: TalentAuditInterviewStatusSchema = Depends(
        talent_audit_interview_status_by_id
    ),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[TalentAuditInterviewStatusSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Guard(OperationVerb.CREATE, EssenceName.TALENT_AUDIT_INTERVIEW_STATUS)
    ],
)
async def create_talent_audit_interview_status(
    status_in: TalentAuditInterviewStatusCreate,
    service: Annotated[
        TalentAuditInterviewStatusService,
        Depends(get_talent_audit_interview_status_service),
    ],
):
    return await service.create_talent_audit_interview_status(status_in)


@router.patch(
    "/{talent_audit_interview_status_id}",
    response_model=MutationResponse[TalentAuditInterviewStatusSchema],
    dependencies=[
        Guard(OperationVerb.MODIFY, EssenceName.TALENT_AUDIT_INTERVIEW_STATUS)
    ],
)
async def update_talent_audit_interview_status(
    status_update: TalentAuditInterviewStatusUpdate,
    record: TalentAuditInterviewStatusSchema = Depends(
        talent_audit_interview_status_by_id
    ),
    service: Annotated[
        TalentAuditInterviewStatusService,
        Depends(get_talent_audit_interview_status_service),
    ] = None,
):
    return await service.update_talent_audit_interview_status(record.id, status_update)


@router.delete(
    "/{talent_audit_interview_status_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[
        Guard(OperationVerb.DELETE, EssenceName.TALENT_AUDIT_INTERVIEW_STATUS)
    ],
)
async def delete_talent_audit_interview_status(
    talent_audit_interview_status_id: int,
    service: Annotated[
        TalentAuditInterviewStatusService,
        Depends(get_talent_audit_interview_status_service),
    ],
):
    await service.delete_talent_audit_interview_status(talent_audit_interview_status_id)
