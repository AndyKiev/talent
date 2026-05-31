from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.review_dimension_criteria.review_dimension_criteria_model import (
    ReviewDimensionCriteria,
)


class ReviewDimensionCriteriaRepository(BaseRepository):
    model = ReviewDimensionCriteria
