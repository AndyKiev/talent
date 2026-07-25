from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class EmployeeEventBase(BaseModel):
    event_type_id: int
    status_id: int
    effective_date: date
    description: str | None = Field(None, max_length=512)


class EmployeeEventCreate(EmployeeEventBase):
    """
    Full event creation payload — the caller submits the event header
    together with all direction-change rows in one request.
    `employee_id` comes from the URL path; `created_by` is injected
    by the service from the authenticated HRM session.
    """

    changes: list[EmployeeEventChangeCreate] = []


class EmployeeEventUpdate(BaseModel):
    """
    Patch payload for the event header.
    Status transitions use the dedicated /apply endpoint;
    `status_id` is also patchable directly for admin corrections.
    Changes are managed via their own nested endpoints.
    """

    status_id: int | None = None
    effective_date: date | None = None
    description: str | None = Field(None, max_length=512)


class EmployeeEventSchema(EmployeeEventBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    employee_id: int
    created_by: int
    created_at: datetime
    event_type: EmployeeEventType | None = None
    status: EmployeeEventStatusSchema | None = None
    changes: list[EmployeeEventChangeSchema] = []


class EmployeeEventFlat(EmployeeEventBase):
    """
    Slim read schema for list views — omits the full changes tree.
    Use the detail endpoint to get the full change breakdown.
    """

    model_config = ConfigDict(from_attributes=True)
    id: int
    employee_id: int
    created_by: int
    created_at: datetime
    event_type: EmployeeEventType | None = None
    status: EmployeeEventStatusSchema | None = None


# ── Late imports — outside TYPE_CHECKING so model_rebuild can resolve them ─────

from backend.api_v1.employee_events.employee_event_change.employee_event_change_schema import (  # noqa: E402
    EmployeeEventChangeCreate,
    EmployeeEventChangeSchema,
)
from backend.api_v1.employee_events.employee_event_status.employee_event_status_schema import (  # noqa: E402
    EmployeeEventStatusSchema,
)
from backend.api_v1.employee_events.employee_event_type.employee_event_type_schema import (  # noqa: E402
    EmployeeEventType,
)

EmployeeEventCreate.model_rebuild()
EmployeeEventSchema.model_rebuild()
EmployeeEventFlat.model_rebuild()
