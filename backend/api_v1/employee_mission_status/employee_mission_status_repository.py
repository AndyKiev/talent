from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.employee_mission_status.employee_mission_status_model import (
    EmployeeMissionStatus,
)


class EmployeeMissionStatusRepository(BaseRepository):
    """CRUD only — everything is inherited from BaseRepository."""

    model = EmployeeMissionStatus
