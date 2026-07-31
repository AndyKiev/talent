from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PersonEventChangeBase(BaseModel):
    field_key: str = Field(..., max_length=64)
    new_value: str | None = None


class PersonEventChangeCreate(PersonEventChangeBase):
    """prev_value is deliberately absent: it is captured from the live record at
    APPLY time, not supplied by the caller."""


class PersonEventChangeSchema(PersonEventChangeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    event_id: int
    prev_value: str | None = None
    created_at: datetime
