from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class EmployeeMissionStatusBase(BaseModel):
    key: str = Field(..., max_length=32)
    description: Optional[str] = Field(None, max_length=256)


class EmployeeMissionStatusCreate(EmployeeMissionStatusBase):
    pass


class EmployeeMissionStatusUpdate(BaseModel):
    key: Optional[str] = Field(None, max_length=32)
    description: Optional[str] = Field(None, max_length=256)
    sort_order: Optional[int] = None


class EmployeeMissionStatus(EmployeeMissionStatusBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    sort_order: int = 0
