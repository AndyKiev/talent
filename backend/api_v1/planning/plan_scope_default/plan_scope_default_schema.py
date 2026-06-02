from __future__ import annotations

from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

from backend.api_v1.job_group.job_group_schema import JobGroup as JobGroupSchema
from backend.api_v1.talent_status.talent_status_schema import (
    TalentStatus as TalentStatusSchema,
)


class PlanScopeDefaultBase(BaseModel):
    job_group_id: int
    talent_status_id: Optional[int] = None


class PlanScopeDefaultCreate(PlanScopeDefaultBase):
    pass


class PlanScopeDefault(PlanScopeDefaultBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    job_group: Optional[JobGroupSchema] = None
    talent_status: Optional[TalentStatusSchema] = None
