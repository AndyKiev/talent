from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.employee_events.employee_event_type.employee_event_type_model import EmployeeEventType


class EmployeeEventTypeRepository(BaseRepository):
    model = EmployeeEventType
