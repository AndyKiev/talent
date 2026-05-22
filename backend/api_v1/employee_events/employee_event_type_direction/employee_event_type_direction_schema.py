from __future__ import annotations

from pydantic import BaseModel, ConfigDict
from typing import Optional


class EmployeeEventTypeDirectionBase(BaseModel):
    event_type_id: int
    direction_type_id: int
    is_required: bool = True
    sort_order: int = 0


class EmployeeEventTypeDirectionCreate(BaseModel):
    """
    Used when configuring a new direction slot for an event type.
    `event_type_id` comes from the URL path, so it is not in the body.
    """
    direction_type_id: int
    is_required: bool = True
    sort_order: int = 0


class EmployeeEventTypeDirectionUpdate(BaseModel):
    is_required: Optional[bool] = None
    sort_order: Optional[int] = None


class EmployeeEventTypeDirection(EmployeeEventTypeDirectionBase):
    """Full read schema — includes the resolved direction type."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    direction_type: Optional["EmployeeEventDirectionType"] = None


class EmployeeEventTypeDirectionNested(BaseModel):
    """
    Slim read schema — embedded inside EmployeeEventType to show
    which directions belong to it without circular nesting.
    """
    model_config = ConfigDict(from_attributes=True)
    id: int
    direction_type_id: int
    is_required: bool
    sort_order: int
    direction_type: Optional["EmployeeEventDirectionType"] = None


# ── Late import — must be outside TYPE_CHECKING so the name is available
# when model_rebuild() resolves forward references at module load time.
from backend.api_v1.employee_events.employee_event_direction_type.employee_event_direction_type_schema import (  # noqa: E402
    EmployeeEventDirectionType,
)

EmployeeEventTypeDirection.model_rebuild()
EmployeeEventTypeDirectionNested.model_rebuild()