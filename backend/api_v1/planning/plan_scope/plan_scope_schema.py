from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from backend.api_v1.department.department_schema import (
    DepartmentFlat as DepartmentFlatSchema,
)
from backend.api_v1.job_group.job_group_schema import JobGroup as JobGroupSchema
from backend.api_v1.region.region_schema import RegionSlim
from backend.api_v1.talent_status.talent_status_schema import (
    TalentStatus as TalentStatusSchema,
)


class PlanScopeBase(BaseModel):
    plan_session_id: int
    department_id: int
    job_group_id: int
    talent_status_id: int | None = None
    value: int | None = Field(None, ge=0, le=100)
    is_active: bool = True


class PlanScopeUpdate(BaseModel):
    """Only the plan value is user-editable (when session is 'open')."""

    value: int | None = Field(None, ge=0, le=100)


class PlanScope(PlanScopeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    department: DepartmentFlatSchema | None = None
    job_group: JobGroupSchema | None = None
    talent_status: TalentStatusSchema | None = None
    region: RegionSlim | None = None
