
from pydantic import BaseModel, ConfigDict, Field


class EmployeeEducationBase(BaseModel):
    institution: str = Field(..., max_length=256)
    degree_id: int | None = None
    speciality: str | None = Field(None, max_length=256)
    graduation_year: int | None = None


class EmployeeEducationCreate(EmployeeEducationBase):
    employee_id: int


class EmployeeEducationUpdate(BaseModel):
    institution: str | None = Field(None, max_length=256)
    degree_id: int | None = None
    speciality: str | None = Field(None, max_length=256)
    graduation_year: int | None = None


class EmployeeEducation(EmployeeEducationBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    employee_id: int
