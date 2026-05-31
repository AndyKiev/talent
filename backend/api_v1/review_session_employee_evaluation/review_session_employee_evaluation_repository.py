from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.review_session_employee_evaluation.review_session_employee_evaluation_model import (
    ReviewSessionEmployeeEvaluation,
)


class ReviewSessionEmployeeEvaluationRepository(BaseRepository):
    model = ReviewSessionEmployeeEvaluation
