from fastapi import APIRouter, Depends, status
from typing import Annotated, List, Optional

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.interview.interview_schema import (
    InterviewFeedbackSchema,
    InterviewFeedbackCreate,
)
from backend.api_v1.interview_feedback.interview_feedback_dependencies import (
    get_interview_feedback_service,
)
from backend.api_v1.interview_feedback.interview_feedback_service import (
    InterviewFeedbackService,
)
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.auth.guards import Guard
from backend.utils.enums import OperationVerb, EssenceName

router = APIRouter(
    prefix="/interview_feedbacks",
    tags=["Interview Feedback"],
    dependencies=[Depends(get_current_active_auth_user)],
)


@router.get(
    "",
    response_model=List[InterviewFeedbackSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.INTERVIEW_FEEDBACK)],
)
async def get_interview_feedbacks(
    service: Annotated[
        InterviewFeedbackService, Depends(get_interview_feedback_service)
    ],
    interview_id: Optional[int] = None,
    candidate_id: Optional[int] = None,
):
    return await service.get_feedbacks(
        interview_id=interview_id, candidate_id=candidate_id
    )


@router.post(
    "",
    response_model=MutationResponse[InterviewFeedbackSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.INTERVIEW_FEEDBACK)],
)
async def create_interview_feedback(
    feedback_in: InterviewFeedbackCreate,
    service: Annotated[
        InterviewFeedbackService, Depends(get_interview_feedback_service)
    ],
):
    return await service.create_feedback(feedback_in)
