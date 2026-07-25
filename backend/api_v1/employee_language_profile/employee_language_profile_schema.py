
from pydantic import BaseModel, ConfigDict

from backend.api_v1.employee_language.employee_language_schema import (
    EmployeeLanguageInput,
    EmployeeLanguageItem,
)


class EmployeeLanguageProfileSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    person_id: int
    languages: list[EmployeeLanguageItem] = []


class EmployeeLanguageProfileUpsert(BaseModel):
    languages: list[EmployeeLanguageInput] = []
