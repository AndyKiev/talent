from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.employee_events.employee_event_change_department.employee_event_change_department_model import (
    EmployeeEventChangeDepartment,
)


class EmployeeEventChangeDepartmentRepository(BaseRepository):
    model = EmployeeEventChangeDepartment
