from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.employee_child.employee_child_model import EmployeeChild


class EmployeeChildRepository(BaseRepository):
    model = EmployeeChild
