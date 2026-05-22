from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.employee_events.employee_event_change.employee_event_change_model import EmployeeEventChange


class EmployeeEventChangeRepository(BaseRepository):
    model = EmployeeEventChange
