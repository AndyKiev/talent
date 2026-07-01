from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.employee_training_status.employee_training_status_model import (
    EmployeeTrainingStatus,
)


class EmployeeTrainingStatusRepository(BaseRepository):
    model = EmployeeTrainingStatus
