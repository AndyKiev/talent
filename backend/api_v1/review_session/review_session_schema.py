import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ReviewSessionBase(BaseModel):
    name: str = Field(..., max_length=256)
    description: str | None = None
    period_start: datetime.date | None = None
    period_end: datetime.date | None = None


class ReviewSessionCreate(ReviewSessionBase):
    department_id: int | None = None


class ReviewSessionUpdate(BaseModel):
    name: str | None = Field(None, max_length=256)
    description: str | None = None
    period_start: datetime.date | None = None
    period_end: datetime.date | None = None


class ReviewSession(ReviewSessionBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    status_id: int
    status: str
    employee_count: int = 0
    department_name: str | None = None


class ReviewSessionDetail(ReviewSession):
    pass


class FrozenParamsSection(BaseModel):
    """One frozen table's rows, dumped generically (column name -> value)."""

    table: str
    rows: list[dict[str, Any]] = []


class FrozenParamsResponse(BaseModel):
    sections: list[FrozenParamsSection] = []
