from typing import Annotated

from fastapi import APIRouter, Depends, status

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.recruitment_interview.recruitment_interview_schema import (
    RecruitmentInterviewFeedbackCreate,
    RecruitmentInterviewFeedbackSchema,
)
from backend.api_v1.recruitment_interview_feedback.recruitment_interview_feedback_dependencies import (
    get_interview_feedback_service,
)
from backend.api_v1.recruitment_interview_feedback.recruitment_interview_feedback_service import (
    RecruitmentInterviewFeedbackService,
)
from backend.auth.guards import Guard
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/recruitment_interview_feedbacks",
    tags=["RecruitmentInterview Feedback"],
    dependencies=[Depends(get_current_active_auth_user)],
)


@router.get(
    "",
    response_model=list[RecruitmentInterviewFeedbackSchema],
    dependencies=[
        Guard(OperationVerb.VIEW, EssenceName.RECRUITMENT_INTERVIEW_FEEDBACK)
    ],
)
async def get_interview_feedbacks(
    service: Annotated[
        RecruitmentInterviewFeedbackService, Depends(get_interview_feedback_service)
    ],
    interview_id: int | None = None,
    candidate_id: int | None = None,
):
    return await service.get_feedbacks(
        interview_id=interview_id, candidate_id=candidate_id
    )


@router.post(
    "",
    response_model=MutationResponse[RecruitmentInterviewFeedbackSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Guard(OperationVerb.CREATE, EssenceName.RECRUITMENT_INTERVIEW_FEEDBACK)
    ],
)
async def create_interview_feedback(
    feedback_in: RecruitmentInterviewFeedbackCreate,
    service: Annotated[
        RecruitmentInterviewFeedbackService, Depends(get_interview_feedback_service)
    ],
):
    return await service.create_feedback(feedback_in)
