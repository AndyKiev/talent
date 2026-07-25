from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.security import HTTPBearer

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.talent_audit_interview.talent_audit_interview_dependencies import (
    get_talent_audit_interview_service,
    talent_audit_interview_by_id,
)
from backend.api_v1.talent_audit_interview.talent_audit_interview_schema import (
    TalentAuditInterview as TalentAuditInterviewSchema,
)
from backend.api_v1.talent_audit_interview.talent_audit_interview_schema import (
    TalentAuditInterviewCreate,
    TalentAuditInterviewUpdate,
)
from backend.api_v1.talent_audit_interview.talent_audit_interview_service import (
    TalentAuditInterviewService,
)
from backend.auth.guards import Guard
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/talent_audit_interviews",
    tags=["Talent Audit Interviews"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "",
    response_model=list[TalentAuditInterviewSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.TALENT_AUDIT_INTERVIEW)],
)
async def get_talent_audit_interviews(
    service: Annotated[
        TalentAuditInterviewService, Depends(get_talent_audit_interview_service)
    ],
    sort: str | None = Query(
        None,
        description='JSON for sorting: {"field": "asc|desc"} or [{"field1": "asc"}, "field2"]',
    ),
):
    return await service.get_talent_audit_interviews(sort=sort)


# ── Static path segments before dynamic /{id} ────────────────────────────────


@router.get(
    "/by_talent_audit/{talent_audit_id}",
    response_model=list[TalentAuditInterviewSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.TALENT_AUDIT_INTERVIEW)],
)
async def get_interviews_by_audit(
    talent_audit_id: int,
    service: Annotated[
        TalentAuditInterviewService, Depends(get_talent_audit_interview_service)
    ],
):
    return await service.get_by_talent_audit_id(talent_audit_id)


@router.get(
    "/free_jobs/{talent_audit_id}",
    response_model=list[dict],
    summary="Get audit jobs eligible for a new interview",
    description=(
        "Returns talent_audit_job records that have 'created' status "
        "and are not yet linked to any interview."
    ),
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.TALENT_AUDIT_INTERVIEW)],
)
async def get_free_audit_jobs(
    talent_audit_id: int,
    service: Annotated[
        TalentAuditInterviewService, Depends(get_talent_audit_interview_service)
    ],
):
    return await service.get_free_audit_jobs_for_audit(talent_audit_id)


@router.get(
    "/{talent_audit_interview_id}",
    response_model=TalentAuditInterviewSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.TALENT_AUDIT_INTERVIEW)],
)
async def get_talent_audit_interview(
    record: TalentAuditInterviewSchema = Depends(talent_audit_interview_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[TalentAuditInterviewSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.TALENT_AUDIT_INTERVIEW)],
)
async def create_talent_audit_interview(
    interview_in: TalentAuditInterviewCreate,
    service: Annotated[
        TalentAuditInterviewService, Depends(get_talent_audit_interview_service)
    ],
):
    return await service.create_talent_audit_interview(interview_in)


@router.patch(
    "/{talent_audit_interview_id}",
    response_model=MutationResponse[TalentAuditInterviewSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.TALENT_AUDIT_INTERVIEW)],
)
async def update_talent_audit_interview(
    interview_update: TalentAuditInterviewUpdate,
    record: TalentAuditInterviewSchema = Depends(talent_audit_interview_by_id),
    service: Annotated[
        TalentAuditInterviewService, Depends(get_talent_audit_interview_service)
    ] = None,
):
    return await service.update_talent_audit_interview(record.id, interview_update)


@router.delete(
    "/{talent_audit_interview_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.TALENT_AUDIT_INTERVIEW)],
)
async def delete_talent_audit_interview(
    talent_audit_interview_id: int,
    service: Annotated[
        TalentAuditInterviewService, Depends(get_talent_audit_interview_service)
    ],
):
    await service.delete_talent_audit_interview(talent_audit_interview_id)
