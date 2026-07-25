from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class PersonBase(BaseModel):
    first_name: str = Field(..., max_length=64)
    last_name: str = Field(..., max_length=64)
    patronymic: str | None = Field(None, max_length=64)
    sex: Literal["male", "female"] | None = None
    marital_status: Literal["married", "not_married"] | None = None
    birth_date: date | None = None


class PersonCreate(PersonBase):
    # True = caller confirmed the namesake conflict; the service assigns the
    # next name_dedupe_no instead of raising PersonNameExists.
    allow_duplicate: bool = False


class PersonUpdate(BaseModel):
    first_name: str | None = Field(None, max_length=64)
    last_name: str | None = Field(None, max_length=64)
    patronymic: str | None = Field(None, max_length=64)
    sex: Literal["male", "female"] | None = None
    marital_status: Literal["married", "not_married"] | None = None
    birth_date: date | None = None
    allow_duplicate: bool = False


class PersonEmployeeSlim(BaseModel):
    """Slim employee info nested in person responses (grid + duplicate modal)."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    code: str
    name: str
    job_name: str | None = None
    department_name: str | None = None


class PersonSchema(PersonBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    name_dedupe_no: int = 0
    sex: str | None = None
    marital_status: str | None = None
    employees: list[PersonEmployeeSlim] = []


class PersonNameMatch(BaseModel):
    """One existing person matching a checked (last, first) pair."""

    person_id: int
    first_name: str | None = None
    last_name: str | None = None
    patronymic: str | None = None
    name_dedupe_no: int = 0
    employees: list[PersonEmployeeSlim] = []


class PersonCheckNameResponse(BaseModel):
    matches: list[PersonNameMatch] = []
