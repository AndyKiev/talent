from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.employee_recommended_training.employee_recommended_training_model import (
    EmployeeRecommendedTraining,
)


class EmployeeRecommendedTrainingRepository(BaseRepository):
    """CRUD only — everything is inherited from BaseRepository."""

    model = EmployeeRecommendedTraining
