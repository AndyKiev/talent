from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class DepartmentJobTargetBase(BaseModel):
    department_id: int
    department_type_job_link_id: int
    qty: int = Field(ge=0)
    effective_date: date


class DepartmentJobTargetCreate(DepartmentJobTargetBase):
    pass


class DepartmentJobTargetUpdate(BaseModel):
    qty: int = Field(ge=0)
    effective_date: date


class DepartmentJobTarget(DepartmentJobTargetBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    created_by: Optional[int] = None
    # Resolved from the author relationship in the service.
    created_by_name: Optional[str] = None


class FactEmployee(BaseModel):
    """One employee counted in a fact qty (as-of state matched the row)."""

    id: int
    code: str
    name: str
    # True when this placement depends on a ready (not-yet-applied) event.
    is_pending: bool = False


class HeadcountCalcRow(BaseModel):
    """One grid row of the plan-vs-fact calculation for a department + date."""

    link_id: int
    job_id: int
    job_name: str
    link_is_active: bool
    plan_qty: int
    has_plan: bool
    fact_qty: int
    # Of fact_qty, how many rest on a not-yet-applied (ready) event.
    fact_pending_qty: int = 0


class TargetCountByLink(BaseModel):
    """How many target rows reference a department-type job link (delete warning)."""

    count: int
