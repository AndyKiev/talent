from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class EmployeeTrainingStatusBase(BaseModel):
    key: str = Field(..., max_length=32)
    description: str | None = Field(None, max_length=256)


class EmployeeTrainingStatusCreate(EmployeeTrainingStatusBase):
    pass


class EmployeeTrainingStatusUpdate(BaseModel):
    key: str | None = Field(None, max_length=32)
    description: str | None = Field(None, max_length=256)
    sort_order: int | None = None


class EmployeeTrainingStatus(EmployeeTrainingStatusBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    sort_order: int = 0
