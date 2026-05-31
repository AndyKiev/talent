from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.review_dimension.review_dimension_model import ReviewDimension


class ReviewDimensionRepository(BaseRepository):
    model = ReviewDimension
