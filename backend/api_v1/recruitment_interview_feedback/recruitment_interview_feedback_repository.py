from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.recruitment_interview_feedback.recruitment_interview_feedback_model import (
    RecruitmentInterviewFeedback,
)


class RecruitmentInterviewFeedbackRepository(BaseRepository):
    model = RecruitmentInterviewFeedback
