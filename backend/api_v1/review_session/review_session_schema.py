from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
import datetime


class ReviewSessionBase(BaseModel):
    name: str = Field(..., max_length=256)
    description: Optional[str] = None
    period_start: Optional[datetime.date] = None
    period_end: Optional[datetime.date] = None


class ReviewSessionCreate(ReviewSessionBase):
    pass


class ReviewSessionUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=256)
    description: Optional[str] = None
    status: Optional[str] = None
    period_start: Optional[datetime.date] = None
    period_end: Optional[datetime.date] = None


class ReviewSession(ReviewSessionBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    status: str
    employee_count: int = 0


class ReviewSessionDetail(ReviewSession):
    pass
