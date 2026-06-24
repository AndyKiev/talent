from __future__ import annotations

from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

from backend.api_v1.department.department_schema import (
    DepartmentFlat as DepartmentSchema,
)
from backend.api_v1.department.department_org_units import TopOrgUnit


# ── Input schemas ──────────────────────────────────────────────────────────────


class EmployeeDepartmentCreate(BaseModel):
    department_id: int
    is_main: Optional[bool] = False


class EmployeeDepartmentUpdate(BaseModel):
    department_id: Optional[int] = None
    is_main: Optional[bool] = None


# ── Read schema ────────────────────────────────────────────────────────────────


class EmployeeDepartmentSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    employee_id: int
    department_id: int
    is_main: bool
    created_at: datetime
    department: Optional[DepartmentSchema] = None
    # Derived top-level org unit (board / directorate / store) for this
    # assignment's department — resolved server-side by walking up the tree.
    top_department: Optional[TopOrgUnit] = None


# ── Count response ─────────────────────────────────────────────────────────────


class EmployeeDepartmentCount(BaseModel):
    employee_id: int
    count: int
