from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.review_session_criterion.review_session_criterion_model import (
    ReviewSessionCriterion,
)


class ReviewSessionCriterionRepository(BaseRepository):
    model = ReviewSessionCriterion
