from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.review_session_employee.review_session_employee_model import (
    ReviewSessionEmployee,
)


class ReviewSessionEmployeeRepository(BaseRepository):
    model = ReviewSessionEmployee
