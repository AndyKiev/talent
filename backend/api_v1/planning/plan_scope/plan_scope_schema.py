from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime

from backend.api_v1.department.department_schema import (
    DepartmentFlat as DepartmentFlatSchema,
)
from backend.api_v1.job_group.job_group_schema import JobGroup as JobGroupSchema
from backend.api_v1.talent_status.talent_status_schema import (
    TalentStatus as TalentStatusSchema,
)


class PlanScopeBase(BaseModel):
    plan_session_id: int
    department_id: int
    job_group_id: int
    talent_status_id: Optional[int] = None
    value: Optional[int] = Field(None, ge=0, le=100)


class PlanScopeUpdate(BaseModel):
    """Only the plan value is user-editable (when session is 'open')."""
    value: Optional[int] = Field(None, ge=0, le=100)


class PlanScope(PlanScopeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    department: Optional[DepartmentFlatSchema] = None
    job_group: Optional[JobGroupSchema] = None
    talent_status: Optional[TalentStatusSchema] = None
