from pydantic import BaseModel, ConfigDict, Field
from typing import Any, Dict, List, Optional
import datetime


class ReviewSessionBase(BaseModel):
    name: str = Field(..., max_length=256)
    description: Optional[str] = None
    period_start: Optional[datetime.date] = None
    period_end: Optional[datetime.date] = None


class ReviewSessionCreate(ReviewSessionBase):
    department_id: Optional[int] = None


class ReviewSessionUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=256)
    description: Optional[str] = None
    period_start: Optional[datetime.date] = None
    period_end: Optional[datetime.date] = None


class ReviewSession(ReviewSessionBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    status_id: int
    status: str
    employee_count: int = 0
    department_name: Optional[str] = None


class ReviewSessionDetail(ReviewSession):
    pass


class FrozenParamsSection(BaseModel):
    """One frozen table's rows, dumped generically (column name -> value)."""

    table: str
    rows: List[Dict[str, Any]] = []


class FrozenParamsResponse(BaseModel):
    sections: List[FrozenParamsSection] = []
