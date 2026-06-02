from typing import Annotated, List

from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPBearer

from backend.api_v1.talent_audit_interview_job.talent_audit_interview_job_dependencies import (
    get_talent_audit_interview_job_service,
    talent_audit_interview_job_by_id,
)
from backend.api_v1.talent_audit_interview_job.talent_audit_interview_job_schema import (
    TalentAuditInterviewJob as TalentAuditInterviewJobSchema,
)
from backend.api_v1.talent_audit_interview_job.talent_audit_interview_job_service import (
    TalentAuditInterviewJobService,
)

router = APIRouter(
    prefix="/talent_audit_interview_jobs",
    tags=["Talent Audit Interview Jobs"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "/by_interview/{talent_audit_interview_id}",
    response_model=List[TalentAuditInterviewJobSchema],
)
async def get_by_interview(
    talent_audit_interview_id: int,
    service: Annotated[
        TalentAuditInterviewJobService,
        Depends(get_talent_audit_interview_job_service),
    ],
):
    return await service.get_by_interview_id(talent_audit_interview_id)


@router.get(
    "/{talent_audit_interview_job_id}",
    response_model=TalentAuditInterviewJobSchema,
)
async def get_talent_audit_interview_job(
    record: TalentAuditInterviewJobSchema = Depends(talent_audit_interview_job_by_id),
):
    return record


@router.delete("/{talent_audit_interview_job_id}", status_code=status.HTTP_200_OK)
async def delete_talent_audit_interview_job(
    talent_audit_interview_job_id: int,
    service: Annotated[
        TalentAuditInterviewJobService,
        Depends(get_talent_audit_interview_job_service),
    ],
):
    await service.delete_interview_job(talent_audit_interview_job_id)
