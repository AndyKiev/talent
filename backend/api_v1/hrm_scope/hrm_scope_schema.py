from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, model_validator


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
    department_id: int | None = None
    start_date: date | None = None
    end_date: date | None = None


class HrmScopeSchema(HrmScopeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    employee_user_group_link_id: int | None = None

    # Read-only enrichments (populated via setattr in the service _to_schema).
    employee_code: str | None = None
    employee_name: str | None = None
    department_name: str | None = None
    department_category_id: int | None = None
    department_category_name: str | None = None
    is_currently_active: bool | None = None


class HrmEmployeeRow(BaseModel):
    """An HRM-eligible employee (has the HRM authorisation group) for the grid."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    code: str
    name: str
    email: str | None = None
    job_name: str | None = None
    scope_count: int = 0
    active_scope_count: int = 0
