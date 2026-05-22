from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.employee_events.employee_event_type_direction.employee_event_type_direction_model import (
    EmployeeEventTypeDirection,
)


class EmployeeEventTypeDirectionRepository(BaseRepository):
    model = EmployeeEventTypeDirection
