from pydantic import BaseModel, ConfigDict
from typing import Optional


class EmployeeLanguageItem(BaseModel):
    """One language row as returned to the client (with resolved level info)."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    language: str
    level_id: Optional[int] = None
    level_code: Optional[str] = None
    level_hint: Optional[str] = None


class EmployeeLanguageInput(BaseModel):
    """One language row as submitted by the client when saving a profile."""

    language: str
    level_id: Optional[int] = None
