from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class TalentAuditBase(BaseModel):
    employee_id: int
    status_id: int


class TalentAuditCreate(TalentAuditBase):
    # created_by injected from the authenticated user in the service
    # talent_plus is not set at creation; defaults to False in the DB.
    pass


class TalentAuditUpdate(BaseModel):
    # All optional — PATCH may carry only status_id, only talent_plus, or both.
    status_id: int | None = None
    talent_plus: bool | None = None


class TalentAudit(TalentAuditBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    talent_plus: bool
    created_by: int
    created_at: datetime


# ── Talent employees roster (Employees → Talent employees) ──────────────────
class TalentRosterTalent(BaseModel):
    """One talent (target job) of an employee, with its EFFECTIVE status /
    period: the latest HRS interview result when one exists, else the HRM one."""

    talent_audit_job_id: int
    target_job_id: int
    job_name: str
    job_status_id: int
    job_status_key: str
    job_status_name: str
    talent_status_id: int
    talent_status_key: str
    talent_period_id: int
    talent_period_name: str
    qty_months: int
    is_hrs: bool
    hrm_label: str
    hrs_label: str | None = None
    interview_id: int | None = None
    interview_date: date | None = None


class TalentRosterRow(BaseModel):
    employee_id: int
    code: str
    name: str
    status_id: int | None = None
    status_name: str | None = None
    job_id: int | None = None
    job_name: str | None = None
    main_department_id: int | None = None
    main_department_name: str | None = None
    talent_audit_id: int | None = None
    talent_plus: bool = False
    # Sorted by qty_months ascending: talents[0] is the MAIN (closest) one.
    talents: list[TalentRosterTalent] = []


class TalentRosterPage(BaseModel):
    items: list[TalentRosterRow]
    total: int


class TalentRosterOption(BaseModel):
    id: int
    name: str


class TalentRosterEmployeeOption(BaseModel):
    id: int
    code: str
    name: str


class TalentRosterDepartmentOption(TalentRosterOption):
    category_sort_order: int


class TalentRosterOptions(BaseModel):
    """Filter options for the roster, drawn from the employees visible in the
    chosen department scope (before the other filters narrow them)."""

    employees: list[TalentRosterEmployeeOption]
    departments: list[TalentRosterDepartmentOption]
    jobs: list[TalentRosterOption]
    statuses: list[TalentRosterOption]
    # Active talent statuses (name = key, e.g. PO/PA) and periods (by months).
    talent_statuses: list[TalentRosterOption]
    talent_periods: list[TalentRosterOption]
