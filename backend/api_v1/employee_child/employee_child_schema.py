from datetime import date
from pydantic import BaseModel, ConfigDict


class EmployeeChildBase(BaseModel):
    birth_date: date


class EmployeeChildCreate(EmployeeChildBase):
    employee_id: int


class EmployeeChild(EmployeeChildBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    employee_id: int
