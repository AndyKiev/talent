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
    # True when the employee has ANY open (draft/ready) event — regardless of
    # its effective date. A new event cannot be created until it is applied,
    # so the organigram disables dragging such employees.
    has_open_event: bool = False


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


class OrganigramJob(BaseModel):
    """One job inside an organigram department card — occupied or vacant
    (vacant jobs still render as drop targets and carry the plan qty)."""

    job_id: int
    job_name: str
    # As-of the view date: planned qty (effective-dated targets) and fact qty
    # (provisional placements — matches the calc grid).
    plan_qty: int = 0
    fact_qty: int = 0
    employees: list[FactEmployee]


class OrganigramNode(BaseModel):
    """One department box of the top-down organigram (recursive)."""

    department_id: int
    department_name: str
    department_type_id: Optional[int] = None
    department_type_name: Optional[str] = None
    # Category `key` (e.g. 'store_departments') — drives the FE layout
    # (store departments stack vertically instead of fanning out).
    department_category_key: Optional[str] = None
    jobs: list[OrganigramJob]
    children: list["OrganigramNode"]
