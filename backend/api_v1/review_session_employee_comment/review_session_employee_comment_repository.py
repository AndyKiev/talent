from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.review_session_employee_comment.review_session_employee_comment_model import (
    ReviewSessionEmployeeComment,
)


class ReviewSessionEmployeeCommentRepository(BaseRepository):
    model = ReviewSessionEmployeeComment
