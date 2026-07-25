from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from backend.api_v1.department.department_org_units import TopOrgUnit
from backend.api_v1.department.department_schema import (
    DepartmentFlat as DepartmentSchema,
)

# ── Input schemas ──────────────────────────────────────────────────────────────


class EmployeeDepartmentCreate(BaseModel):
    department_id: int


class EmployeeDepartmentUpdate(BaseModel):
    department_id: int | None = None


# ── Read schema ────────────────────────────────────────────────────────────────


class EmployeeDepartmentSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    employee_id: int
    department_id: int
    created_at: datetime
    department: DepartmentSchema | None = None
    # Derived top-level org unit (board / directorate / store) for this
    # assignment's department — resolved server-side by walking up the tree.
    top_department: TopOrgUnit | None = None
