from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.employee_events.employee_event_direction_type.employee_event_direction_type_model import (
    EmployeeEventDirectionType,
)


class EmployeeEventDirectionTypeRepository(BaseRepository):
    model = EmployeeEventDirectionType
