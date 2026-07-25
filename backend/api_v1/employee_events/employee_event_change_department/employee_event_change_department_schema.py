from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class EmployeeEventChangeDepartmentBase(BaseModel):
    department_type_id: int


class EmployeeEventChangeDepartmentCreate(EmployeeEventChangeDepartmentBase):
    """
    Used when building the dept-type-change rows while creating an event.
    `event_change_id` is set by the service, not the caller.
    """



class EmployeeEventChangeDepartmentSchema(EmployeeEventChangeDepartmentBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    event_change_id: int
    department_type: DepartmentTypeSchema | None = None


# ── Late imports — outside TYPE_CHECKING so model_rebuild can resolve them ─────

from backend.api_v1.department_type.department_type_schema import (  # noqa: E402
    DepartmentType as DepartmentTypeSchema,
)

EmployeeEventChangeDepartmentSchema.model_rebuild()
