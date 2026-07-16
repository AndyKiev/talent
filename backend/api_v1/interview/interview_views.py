from fastapi import APIRouter, Depends, status
from typing import Annotated, List, Optional

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.interview.interview_schema import (
    InterviewSchema,
    InterviewCreate,
    InterviewUpdate,
    InterviewEmployeeMini,
)
from backend.api_v1.interview.interview_dependencies import get_interview_service
from backend.api_v1.interview.interview_service import InterviewService
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.auth.guards import Guard
from backend.utils.enums import OperationVerb, EssenceName

router = APIRouter(
    prefix="/interviews",
    tags=["Interviews"],
    dependencies=[Depends(get_current_active_auth_user)],
)


@router.get(
    "",
    response_model=List[InterviewSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.INTERVIEW)],
)
async def get_interviews(
    service: Annotated[InterviewService, Depends(get_interview_service)],
    application_id: Optional[int] = None,
    candidate_id: Optional[int] = None,
    mine: bool = False,
):
    return await service.get_interviews(
        application_id=application_id, candidate_id=candidate_id, mine=mine
    )


@router.get(
    "/available_interviewers",
    response_model=List[InterviewEmployeeMini],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.INTERVIEW)],
)
async def get_available_interviewers(
    service: Annotated[InterviewService, Depends(get_interview_service)],
):
    return await service.get_available_interviewers()


@router.get(
    "/{interview_id}",
    response_model=InterviewSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.INTERVIEW)],
)
async def get_interview(
    interview_id: int,
    service: Annotated[InterviewService, Depends(get_interview_service)],
):
    return await service.get_interview_detail(interview_id)


@router.post(
    "",
    response_model=MutationResponse[InterviewSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.INTERVIEW)],
)
async def create_interview(
    interview_in: InterviewCreate,
    service: Annotated[InterviewService, Depends(get_interview_service)],
):
    return await service.create_interview(interview_in)


@router.patch(
    "/{interview_id}",
    response_model=MutationResponse[InterviewSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.INTERVIEW)],
)
async def update_interview(
    interview_id: int,
    interview_update: InterviewUpdate,
    service: Annotated[InterviewService, Depends(get_interview_service)],
):
    return await service.update_interview(interview_id, interview_update)


@router.delete(
    "/{interview_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.INTERVIEW)],
)
async def delete_interview(
    interview_id: int,
    service: Annotated[InterviewService, Depends(get_interview_service)],
):
    await service.delete_interview(interview_id)
