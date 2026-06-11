from pydantic import BaseModel, ConfigDict
from typing import List

from backend.api_v1.employee_language.employee_language_schema import (
    EmployeeLanguageItem,
    EmployeeLanguageInput,
)


class EmployeeLanguageProfileSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    employee_id: int
    languages: List[EmployeeLanguageItem] = []


class EmployeeLanguageProfileUpsert(BaseModel):
    languages: List[EmployeeLanguageInput] = []
