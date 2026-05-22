from pydantic import BaseModel, ConfigDict, Field
from typing import Optional


class EmployeeEventStatusBase(BaseModel):
    name: str = Field(..., max_length=32)
    description: Optional[str] = Field(None)


class EmployeeEventStatusCreate(EmployeeEventStatusBase):
    pass


class EmployeeEventStatusUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=32)
    description: Optional[str] = Field(None)


class EmployeeEventStatusSchema(EmployeeEventStatusBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
