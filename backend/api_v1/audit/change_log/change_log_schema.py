import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class ChangeAction(str, Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    APPLY = "apply"
    STATUS_CHANGE = "status_change"
    REVERT = "revert"


class ChangeLogBase(BaseModel):
    change_session_id: int
    parent_id: Optional[int] = None
    essence_key: str = Field(..., max_length=64)
    entity_id: Optional[int] = None
    action: ChangeAction
    # Field-level before/after map: {"field": {"old": ..., "new": ...}}
    changes: Optional[dict[str, Any]] = None


class ChangeLogCreate(ChangeLogBase):
    pass


class ChangeLogEmployee(BaseModel):
    """Slim subject-employee projection for the audit UI."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    code: Optional[str] = None


class ChangeLogSchema(ChangeLogBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime.datetime
    # Subject employee this entry concerns (NULL for entries with no employee,
    # e.g. cascaded talent rows that inherit their parent's employee).
    employee_id: Optional[int] = None
    employee: Optional[ChangeLogEmployee] = None
