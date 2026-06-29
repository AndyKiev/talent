from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.review_session_status.review_session_status_model import (
    ReviewSessionStatus,
)


class ReviewSessionStatusRepository(BaseRepository):
    model = ReviewSessionStatus
