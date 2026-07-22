from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.review_session_employee_dimension_type.review_session_employee_dimension_type_model import (
    ReviewSessionEmployeeDimensionType,
)


class ReviewSessionEmployeeDimensionTypeRepository(BaseRepository):
    """CRUD only — everything is inherited from BaseRepository."""

    model = ReviewSessionEmployeeDimensionType
