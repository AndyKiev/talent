from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.review_session_employee_level.review_session_employee_level_model import (
    ReviewSessionEmployeeLevel,
)


class ReviewSessionEmployeeLevelRepository(BaseRepository):
    model = ReviewSessionEmployeeLevel
