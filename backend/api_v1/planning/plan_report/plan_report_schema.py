# backend/api_v1/planning/plan_report/plan_report_schema.py
from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from backend.api_v1.department.department_schema import (
    DepartmentFlat as DepartmentFlatSchema,
)
from backend.api_v1.job_group.job_group_schema import JobGroup as JobGroupSchema
from backend.api_v1.region.region_schema import RegionSlim
from backend.api_v1.talent_status.talent_status_schema import (
    TalentStatus as TalentStatusSchema,
)


class PlanReportRow(BaseModel):
    """One plan-vs-fact line.

    Mirrors a PlanScope row (department + job_group + optional talent_status)
    but carries the planned `value` AND the computed `fact` (count of
    employees who reached this target via talent audits).

    Only rows whose PlanScope has a non-NULL `value` are emitted by the
    service, so `plan` is always an int here.
    """

    model_config = ConfigDict(from_attributes=True)

    plan_scope_id: int
    department_id: int
    job_group_id: int
    talent_status_id: int | None = None

    plan: int
    fact: int

    department: DepartmentFlatSchema | None = None
    job_group: JobGroupSchema | None = None
    talent_status: TalentStatusSchema | None = None
    region: RegionSlim | None = None


class PlanReport(BaseModel):
    plan_session_id: int
    rows: list[PlanReportRow]
