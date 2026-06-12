from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.employee_education.employee_education_model import EmployeeEducation


class EmployeeEducationRepository(BaseRepository):
    model = EmployeeEducation
