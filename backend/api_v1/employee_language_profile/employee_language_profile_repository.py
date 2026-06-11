from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.employee_language_profile.employee_language_profile_model import (
    EmployeeLanguageProfile,
)


class EmployeeLanguageProfileRepository(BaseRepository):
    model = EmployeeLanguageProfile
