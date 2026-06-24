from __future__ import annotations

from pydantic import BaseModel, ConfigDict, model_validator
from typing import Optional, List
from datetime import date, datetime


class HrmScopeBase(BaseModel):
    employee_id: int
    department_id: int
    start_date: date
    end_date: date

    @model_validator(mode="after")
    def _check_window(self):
        # start_date must not be after end_date (inclusive window).
        if self.start_date > self.end_date:
            raise ValueError("startDateAfterEndDate")
        return self


class HrmScopeCreate(HrmScopeBase):
    pass


class HrmScopeCreateInternal(HrmScopeBase):
    """Service-only create payload: adds the resolved HRM-link FK before the
    row is handed to BaseService.create()."""

    employee_user_group_link_id: int


class HrmScopeUpdate(BaseModel):
    department_id: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class HrmScopeSchema(HrmScopeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    employee_user_group_link_id: Optional[int] = None

    # Read-only enrichments (populated via setattr in the service _to_schema).
    employee_code: Optional[str] = None
    employee_name: Optional[str] = None
    department_name: Optional[str] = None
    department_category_id: Optional[int] = None
    department_category_name: Optional[str] = None
    is_currently_active: Optional[bool] = None


class HrmEmployeeRow(BaseModel):
    """An HRM-eligible employee (has the HRM authorisation group) for the grid."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    code: str
    name: str
    email: Optional[str] = None
    job_name: Optional[str] = None
    scope_count: int = 0
    active_scope_count: int = 0
