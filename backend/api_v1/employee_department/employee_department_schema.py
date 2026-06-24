from __future__ import annotations

from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

from backend.api_v1.department.department_schema import (
    DepartmentFlat as DepartmentSchema,
)


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


# ── Count response ─────────────────────────────────────────────────────────────


class EmployeeDepartmentCount(BaseModel):
    employee_id: int
    count: int
