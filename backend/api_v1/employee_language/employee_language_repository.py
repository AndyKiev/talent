from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.employee_language.employee_language_model import EmployeeLanguage


class EmployeeLanguageRepository(BaseRepository):
    model = EmployeeLanguage
