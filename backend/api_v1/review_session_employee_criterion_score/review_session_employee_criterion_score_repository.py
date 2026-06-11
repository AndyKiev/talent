from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.review_session_employee_criterion_score.review_session_employee_criterion_score_model import (
    ReviewSessionEmployeeCriterionScore,
)


class ReviewSessionEmployeeCriterionScoreRepository(BaseRepository):
    model = ReviewSessionEmployeeCriterionScore
