from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.review_session_employee_level_answer.review_session_employee_level_answer_model import (
    ReviewSessionEmployeeLevelAnswer,
)


class ReviewSessionEmployeeLevelAnswerRepository(BaseRepository):
    model = ReviewSessionEmployeeLevelAnswer
