from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from backend.api_v1.person_events.person_event_change.person_event_change_schema import (
    PersonEventChangeSchema,
)


class PersonEventTypeNested(BaseModel):
    """Slim event type for nesting."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    key: str
    name: str


class PersonEventStatusNested(BaseModel):
    """Slim status for nesting."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class PersonEventBase(BaseModel):
    effective_date: date = Field(..., description="Since when the change applies")
    description: str | None = Field(None, max_length=512)


class LastNameChangeCreate(PersonEventBase):
    """The one person event implemented today.

    A dedicated schema rather than a generic {field_key, new_value} payload: the
    surname change has its own rule (the person must be female unless the app
    setting relaxes it), and a typed field is what makes that rule enforceable
    instead of advisory. A later type gets its own schema the same way.
    """

    new_last_name: str = Field(..., min_length=1, max_length=64)


class PersonEventSchema(PersonEventBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    person_id: int
    event_type_id: int
    status_id: int
    created_by: int | None = None
    created_at: datetime
    event_type: PersonEventTypeNested | None = None
    status: PersonEventStatusNested | None = None
    changes: list[PersonEventChangeSchema] = []
    # Display name of the author, filled from a column query (created_by's
    # relationship is deliberately not loaded).
    created_by_name: str | None = None
    # Statuses this row may move to — read from the state machine, so the UI
    # never has to mirror the transition table by hand.
    allowed_targets: list[str] = []


class PersonEventStatusUpdate(BaseModel):
    """Move a person event along its lifecycle. The machine decides legality."""

    status: str = Field(..., max_length=32)
