from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime


class EmployeeTrainingStatusBase(BaseModel):
    key: str = Field(..., max_length=32)
    description: Optional[str] = Field(None, max_length=256)


class EmployeeTrainingStatusCreate(EmployeeTrainingStatusBase):
    pass


class EmployeeTrainingStatusUpdate(BaseModel):
    key: Optional[str] = Field(None, max_length=32)
    description: Optional[str] = Field(None, max_length=256)
    sort_order: Optional[int] = None


class EmployeeTrainingStatus(EmployeeTrainingStatusBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    sort_order: int = 0
