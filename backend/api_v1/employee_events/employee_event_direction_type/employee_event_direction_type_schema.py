from pydantic import BaseModel, ConfigDict, Field
from typing import Optional


class EmployeeEventDirectionTypeBase(BaseModel):
    code: str = Field(..., max_length=64)
    name: str = Field(..., max_length=128)


class EmployeeEventDirectionTypeCreate(EmployeeEventDirectionTypeBase):
    pass


class EmployeeEventDirectionTypeUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=128)


class EmployeeEventDirectionType(EmployeeEventDirectionTypeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
