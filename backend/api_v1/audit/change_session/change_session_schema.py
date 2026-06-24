import datetime
from enum import Enum
from typing import Any, Optional

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
    triggered_by_user_id: Optional[int] = None
    task_name: Optional[str] = Field(None, max_length=128)
    status: ChangeRunStatus = ChangeRunStatus.RUNNING
    summary: Optional[dict[str, Any]] = None


class ChangeSessionCreate(ChangeSessionBase):
    pass


class ChangeSessionUpdate(BaseModel):
    status: Optional[ChangeRunStatus] = None
    finished_at: Optional[datetime.datetime] = None
    summary: Optional[dict[str, Any]] = None


class ChangeSessionUser(BaseModel):
    """Slim employee projection for the audit UI (actor or subject)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    code: Optional[str] = None


class ChangeSessionSchema(ChangeSessionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    started_at: datetime.datetime
    finished_at: Optional[datetime.datetime] = None
    # Loaded from the `triggered_by` relationship (selectin). NULL for system
    # runs; the triggering employee (id + name) for manual runs.
    triggered_by: Optional[ChangeSessionUser] = None
    # Subject employee the run concerns (NULL for bulk/scheduled sweeps).
    employee_id: Optional[int] = None
    employee: Optional[ChangeSessionUser] = None
