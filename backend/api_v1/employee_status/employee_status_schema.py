
from pydantic import BaseModel, ConfigDict, Field


class EmployeeStatusBase(BaseModel):
    name: str = Field(..., max_length=64)
    description: str | None = Field(None, max_length=200)


class EmployeeStatusCreate(EmployeeStatusBase):
    pass


class EmployeeStatusUpdate(BaseModel):
    name: str | None = Field(None, max_length=64)
    description: str | None = Field(None, max_length=256)


class EmployeeStatus(EmployeeStatusBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
