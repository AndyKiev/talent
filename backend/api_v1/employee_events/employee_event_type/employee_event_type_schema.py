from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class EmployeeEventTypeBase(BaseModel):
    code: str = Field(..., max_length=64)
    name: str = Field(..., max_length=128)
    description: str | None = Field(None, max_length=512)


class EmployeeEventTypeCreate(EmployeeEventTypeBase):
    pass


class EmployeeEventTypeUpdate(BaseModel):
    code: str | None = Field(None, max_length=64)
    name: str | None = Field(None, max_length=128)
    description: str | None = Field(None, max_length=512)


class EmployeeEventType(EmployeeEventTypeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    type_directions: list[EmployeeEventTypeDirectionNested] = []


# ── Late import to avoid circular references ───────────────────────────────────
from backend.api_v1.employee_events.employee_event_type_direction.employee_event_type_direction_schema import (  # noqa: E402
    EmployeeEventTypeDirectionNested,
)

EmployeeEventType.model_rebuild()
