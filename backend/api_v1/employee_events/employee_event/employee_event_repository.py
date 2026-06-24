from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.employee_events.employee_event.employee_event_model import (
    EmployeeEvent,
)


class EmployeeEventRepository(BaseRepository):
    model = EmployeeEvent
