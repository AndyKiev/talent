from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, Query, status
from fastapi.security import HTTPBearer

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.talent_audit_interview.talent_audit_interview_dependencies import (
    get_talent_audit_interview_service,
    talent_audit_interview_by_id,
)
from backend.api_v1.talent_audit_interview.talent_audit_interview_schema import (
    TalentAuditInterview as TalentAuditInterviewSchema,
    TalentAuditInterviewCreate,
    TalentAuditInterviewUpdate,
)
from backend.api_v1.talent_audit_interview.talent_audit_interview_service import (
    TalentAuditInterviewService,
)

router = APIRouter(
    prefix="/talent_audit_interviews",
    tags=["Talent Audit Interviews"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get("", response_model=List[TalentAuditInterviewSchema])
async def get_talent_audit_interviews(
    service: Annotated[TalentAuditInterviewService, Depends(get_talent_audit_interview_service)],
    sort: Optional[str] = Query(
        None,
        description='JSON for sorting: {"field": "asc|desc"} or [{"field1": "asc"}, "field2"]',
    ),
):
    return await service.get_talent_audit_interviews(sort=sort)


@router.get(
    "/by_talent_audit_job/{talent_audit_job_id}",
    response_model=List[TalentAuditInterviewSchema],
)
async def get_talent_audit_interviews_by_job(
    talent_audit_job_id: int,
    service: Annotated[TalentAuditInterviewService, Depends(get_talent_audit_interview_service)],
):
    return await service.get_by_talent_audit_job_id(talent_audit_job_id)


@router.get("/{talent_audit_interview_id}", response_model=TalentAuditInterviewSchema)
async def get_talent_audit_interview(
    record: TalentAuditInterviewSchema = Depends(talent_audit_interview_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[TalentAuditInterviewSchema],
    status_code=status.HTTP_201_CREATED,
)
async def create_talent_audit_interview(
    interview_in: TalentAuditInterviewCreate,
    service: Annotated[TalentAuditInterviewService, Depends(get_talent_audit_interview_service)],
):
    return await service.create_talent_audit_interview(interview_in)


@router.patch(
    "/{talent_audit_interview_id}",
    response_model=MutationResponse[TalentAuditInterviewSchema],
)
async def update_talent_audit_interview(
    interview_update: TalentAuditInterviewUpdate,
    record: TalentAuditInterviewSchema = Depends(talent_audit_interview_by_id),
    service: Annotated[
        TalentAuditInterviewService, Depends(get_talent_audit_interview_service)
    ] = None,
):
    return await service.update_talent_audit_interview(record.id, interview_update)


@router.delete("/{talent_audit_interview_id}", status_code=status.HTTP_200_OK)
async def delete_talent_audit_interview(
    talent_audit_interview_id: int,
    service: Annotated[TalentAuditInterviewService, Depends(get_talent_audit_interview_service)],
):
    await service.delete_talent_audit_interview(talent_audit_interview_id)
