from datetime import date

from pydantic import BaseModel, ConfigDict


class EmployeeChildBase(BaseModel):
    birth_date: date


class EmployeeChildCreate(EmployeeChildBase):
    # The HTTP API speaks employee_id; the service resolves it to the
    # employee's person_id (children belong to the person).
    employee_id: int


class EmployeeChild(EmployeeChildBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    person_id: int
