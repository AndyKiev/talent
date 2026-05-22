from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.employee_events.employee_event_change_dept_type.employee_event_change_dept_type_model import (
    EmployeeEventChangeDeptType,
)


class EmployeeEventChangeDeptTypeRepository(BaseRepository):
    model = EmployeeEventChangeDeptType
