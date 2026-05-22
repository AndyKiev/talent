from __future__ import annotations

from pydantic import BaseModel, ConfigDict
from typing import Optional


class EmployeeEventChangeDepartmentBase(BaseModel):
    department_id: int
    change_dept_type_id: int


class EmployeeEventChangeDepartmentCreate(EmployeeEventChangeDepartmentBase):
    """
    Used when building the dept-change rows while creating an event.
    `event_change_id` is set by the service, not the caller.
    """
    pass


class EmployeeEventChangeDepartmentSchema(EmployeeEventChangeDepartmentBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    event_change_id: int
    department: Optional["DepartmentFlat"] = None
    change_dept_type: Optional["EmployeeEventChangeDeptType"] = None


# ── Late imports — outside TYPE_CHECKING so model_rebuild can resolve them ─────

from backend.api_v1.department.department_schema import DepartmentFlat  # noqa: E402
from backend.api_v1.employee_events.employee_event_change_dept_type.employee_event_change_dept_type_schema import (  # noqa: E402
    EmployeeEventChangeDeptType,
)

EmployeeEventChangeDepartmentSchema.model_rebuild()