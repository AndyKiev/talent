from pydantic import BaseModel, ConfigDict, Field
from typing import Optional


class EmployeeEventChangeDeptTypeBase(BaseModel):
    code: str = Field(..., max_length=64)
    name: str = Field(..., max_length=128)


class EmployeeEventChangeDeptTypeCreate(EmployeeEventChangeDeptTypeBase):
    pass


class EmployeeEventChangeDeptTypeUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=128)


class EmployeeEventChangeDeptType(EmployeeEventChangeDeptTypeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
