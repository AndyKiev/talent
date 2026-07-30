from typing import Annotated

from fastapi import APIRouter, Depends, status

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.recruitment_interview.recruitment_interview_dependencies import (
    get_interview_service,
)
from backend.api_v1.recruitment_interview.recruitment_interview_schema import (
    RecruitmentInterviewCreate,
    RecruitmentInterviewEmployeeMini,
    RecruitmentInterviewSchema,
    RecruitmentInterviewUpdate,
)
from backend.api_v1.recruitment_interview.recruitment_interview_service import (
    RecruitmentInterviewService,
)
from backend.auth.guards import Guard
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/recruitment_interviews",
    tags=["Interviews"],
    dependencies=[Depends(get_current_active_auth_user)],
)


@router.get(
    "",
    response_model=list[RecruitmentInterviewSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.RECRUITMENT_INTERVIEW)],
)
async def get_interviews(
    service: Annotated[RecruitmentInterviewService, Depends(get_interview_service)],
    application_id: int | None = None,
    candidate_id: int | None = None,
    mine: bool = False,
):
    return await service.get_interviews(
        application_id=application_id, candidate_id=candidate_id, mine=mine
    )


@router.get(
    "/available_interviewers",
    response_model=list[RecruitmentInterviewEmployeeMini],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.RECRUITMENT_INTERVIEW)],
)
async def get_available_interviewers(
    service: Annotated[RecruitmentInterviewService, Depends(get_interview_service)],
):
    return await service.get_available_interviewers()


@router.get(
    "/{interview_id}",
    response_model=RecruitmentInterviewSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.RECRUITMENT_INTERVIEW)],
)
async def get_interview(
    interview_id: int,
    service: Annotated[RecruitmentInterviewService, Depends(get_interview_service)],
):
    return await service.get_interview_detail(interview_id)


@router.post(
    "",
    response_model=MutationResponse[RecruitmentInterviewSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.RECRUITMENT_INTERVIEW)],
)
async def create_interview(
    interview_in: RecruitmentInterviewCreate,
    service: Annotated[RecruitmentInterviewService, Depends(get_interview_service)],
):
    return await service.create_interview(interview_in)


@router.patch(
    "/{interview_id}",
    response_model=MutationResponse[RecruitmentInterviewSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.RECRUITMENT_INTERVIEW)],
)
async def update_interview(
    interview_id: int,
    interview_update: RecruitmentInterviewUpdate,
    service: Annotated[RecruitmentInterviewService, Depends(get_interview_service)],
):
    return await service.update_interview(interview_id, interview_update)


@router.delete(
    "/{interview_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.RECRUITMENT_INTERVIEW)],
)
async def delete_interview(
    interview_id: int,
    service: Annotated[RecruitmentInterviewService, Depends(get_interview_service)],
):
    await service.delete_interview(interview_id)
