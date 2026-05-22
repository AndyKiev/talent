from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.employee_status.employee_status_model import EmployeeStatus

class EmployeeStatusRepository(BaseRepository):
    model = EmployeeStatus
