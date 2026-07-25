from __future__ import annotations

from datetime import datetime

from backend.api_v1.department_type.department_type_schema import (
    DepartmentType as DepartmentTypeSchema,
)
from pydantic import BaseModel, ConfigDict

# ── Input schemas ──────────────────────────────────────────────────────────────


class EmployeeResponsibilityDepartmentCreate(BaseModel):
    department_type_id: int


class EmployeeResponsibilityDepartmentUpdate(BaseModel):
    department_type_id: int | None = None


# ── Read schema ────────────────────────────────────────────────────────────────


class EmployeeResponsibilityDepartmentSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    employee_id: int
    department_type_id: int
    created_at: datetime
    department_type: DepartmentTypeSchema | None = None
