from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class EmployeeMissionStatusBase(BaseModel):
    key: str = Field(..., max_length=32)
    description: str | None = Field(None, max_length=256)


class EmployeeMissionStatusCreate(EmployeeMissionStatusBase):
    pass


class EmployeeMissionStatusUpdate(BaseModel):
    key: str | None = Field(None, max_length=32)
    description: str | None = Field(None, max_length=256)
    sort_order: int | None = None


class EmployeeMissionStatus(EmployeeMissionStatusBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    sort_order: int = 0
