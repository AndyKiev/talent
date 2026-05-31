from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.review_session.review_session_model import ReviewSession


class ReviewSessionRepository(BaseRepository):
    model = ReviewSession
