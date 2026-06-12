from pydantic import BaseModel, ConfigDict, Field
from typing import Optional


class EmployeeEducationBase(BaseModel):
    institution: str = Field(..., max_length=256)
    degree_id: Optional[int] = None
    speciality: Optional[str] = Field(None, max_length=256)
    graduation_year: Optional[int] = None


class EmployeeEducationCreate(EmployeeEducationBase):
    employee_id: int


class EmployeeEducationUpdate(BaseModel):
    institution: Optional[str] = Field(None, max_length=256)
    degree_id: Optional[int] = None
    speciality: Optional[str] = Field(None, max_length=256)
    graduation_year: Optional[int] = None


class EmployeeEducation(EmployeeEducationBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    employee_id: int
