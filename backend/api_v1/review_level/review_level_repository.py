from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.review_level.review_level_model import ReviewLevel


class ReviewLevelRepository(BaseRepository):
    model = ReviewLevel
