from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Literal
from datetime import datetime, date


class PersonBase(BaseModel):
    first_name: str = Field(..., max_length=64)
    last_name: str = Field(..., max_length=64)
    patronymic: Optional[str] = Field(None, max_length=64)
    sex: Optional[Literal["male", "female"]] = None
    marital_status: Optional[Literal["married", "not_married"]] = None
    birth_date: Optional[date] = None


class PersonCreate(PersonBase):
    # True = caller confirmed the namesake conflict; the service assigns the
    # next name_dedupe_no instead of raising PersonNameExists.
    allow_duplicate: bool = False


class PersonUpdate(BaseModel):
    first_name: Optional[str] = Field(None, max_length=64)
    last_name: Optional[str] = Field(None, max_length=64)
    patronymic: Optional[str] = Field(None, max_length=64)
    sex: Optional[Literal["male", "female"]] = None
    marital_status: Optional[Literal["married", "not_married"]] = None
    birth_date: Optional[date] = None
    allow_duplicate: bool = False


class PersonEmployeeSlim(BaseModel):
    """Slim employee info nested in person responses (grid + duplicate modal)."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    code: str
    name: str
    job_name: Optional[str] = None
    department_name: Optional[str] = None


class PersonSchema(PersonBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    name_dedupe_no: int = 0
    sex: Optional[str] = None
    marital_status: Optional[str] = None
    employees: List[PersonEmployeeSlim] = []


class PersonNameMatch(BaseModel):
    """One existing person matching a checked (last, first) pair."""

    person_id: int
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    patronymic: Optional[str] = None
    name_dedupe_no: int = 0
    employees: List[PersonEmployeeSlim] = []


class PersonCheckNameResponse(BaseModel):
    matches: List[PersonNameMatch] = []
