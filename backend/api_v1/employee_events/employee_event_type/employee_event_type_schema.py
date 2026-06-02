from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime


class EmployeeEventTypeBase(BaseModel):
    code: str = Field(..., max_length=64)
    name: str = Field(..., max_length=128)
    description: Optional[str] = Field(None, max_length=512)


class EmployeeEventTypeCreate(EmployeeEventTypeBase):
    pass


class EmployeeEventTypeUpdate(BaseModel):
    code: Optional[str] = Field(None, max_length=64)
    name: Optional[str] = Field(None, max_length=128)
    description: Optional[str] = Field(None, max_length=512)


class EmployeeEventType(EmployeeEventTypeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    type_directions: List["EmployeeEventTypeDirectionNested"] = []


# ── Late import to avoid circular references ───────────────────────────────────
from backend.api_v1.employee_events.employee_event_type_direction.employee_event_type_direction_schema import (  # noqa: E402
    EmployeeEventTypeDirectionNested,
)

EmployeeEventType.model_rebuild()
