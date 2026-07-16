from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.interview_feedback.interview_feedback_model import InterviewFeedback


class InterviewFeedbackRepository(BaseRepository):
    model = InterviewFeedback
