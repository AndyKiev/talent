from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.employee_events.employee_event_status.employee_event_status_model import (
    EmployeeEventStatus,
)


class EmployeeEventStatusRepository(BaseRepository):
    model = EmployeeEventStatus
