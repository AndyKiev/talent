import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ChangeSource(str, Enum):
    MANUAL = "manual"
    SYSTEM = "system"


class ChangeRunStatus(str, Enum):
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"


class ChangeSessionBase(BaseModel):
    source: ChangeSource
    triggered_by_user_id: int | None = None
    task_name: str | None = Field(None, max_length=128)
    status: ChangeRunStatus = ChangeRunStatus.RUNNING
    summary: dict[str, Any] | None = None


class ChangeSessionCreate(ChangeSessionBase):
    pass


class ChangeSessionUpdate(BaseModel):
    status: ChangeRunStatus | None = None
    finished_at: datetime.datetime | None = None
    summary: dict[str, Any] | None = None


class ChangeSessionUser(BaseModel):
    """Slim employee projection for the audit UI (actor or subject)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    code: str | None = None


class ChangeSessionSchema(ChangeSessionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    started_at: datetime.datetime
    finished_at: datetime.datetime | None = None
    # Loaded from the `triggered_by` relationship (selectin). NULL for system
    # runs; the triggering employee (id + name) for manual runs.
    triggered_by: ChangeSessionUser | None = None
    # Subject employee the run concerns (NULL for bulk/scheduled sweeps).
    employee_id: int | None = None
    employee: ChangeSessionUser | None = None
