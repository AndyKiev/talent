
from pydantic import BaseModel, ConfigDict


class EmployeeLanguageItem(BaseModel):
    """One language row as returned to the client (with resolved level info)."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    language: str
    level_id: int | None = None
    level_code: str | None = None
    level_hint: str | None = None


class EmployeeLanguageInput(BaseModel):
    """One language row as submitted by the client when saving a profile."""

    language: str
    level_id: int | None = None
