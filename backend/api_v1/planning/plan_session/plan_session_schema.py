from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, model_validator
from typing import Optional, List
from datetime import date, datetime

from backend.api_v1.planning.plan_session_status.plan_session_status_schema import (
    PlanSessionStatus as PlanSessionStatusSchema,
)


class PlanSessionBase(BaseModel):
    name: str = Field(..., max_length=64)
    description: Optional[str] = Field(None, max_length=256)
    start_date: date
    end_date: date

    @model_validator(mode="after")
    def _check_dates(self) -> "PlanSessionBase":
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        return self


class PlanSessionCreate(PlanSessionBase):
    """Status is assigned by the service (always 'pending' on create).

    Frontend defaults: start_date = Jan 1 of current year,
    end_date = Dec 31 of current year (set in the React Hook Form).

    department_category_ids: optional explicit category selection. When empty
    or omitted, the service falls back to plan_category_defaults.
    """
    department_category_ids: Optional[List[int]] = None


class PlanSessionResyncRequest(BaseModel):
    """Optional category ids to ADD to the session before reconciling."""
    add_category_ids: Optional[List[int]] = None


class PlanSessionUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=64)
    description: Optional[str] = Field(None, max_length=256)
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class PlanSession(PlanSessionBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    plan_session_status_id: int
    is_active: bool
    created_at: datetime
    status: Optional[PlanSessionStatusSchema] = None
