
from pydantic import BaseModel, ConfigDict, Field


class EmployeeEventStatusBase(BaseModel):
    name: str = Field(..., max_length=32)
    description: str | None = Field(None)


class EmployeeEventStatusCreate(EmployeeEventStatusBase):
    pass


class EmployeeEventStatusUpdate(BaseModel):
    name: str | None = Field(None, max_length=32)
    description: str | None = Field(None)


class EmployeeEventStatusSchema(EmployeeEventStatusBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
