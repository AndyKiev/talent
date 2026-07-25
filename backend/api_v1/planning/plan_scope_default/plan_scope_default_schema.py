from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from backend.api_v1.job_group.job_group_schema import JobGroup as JobGroupSchema
from backend.api_v1.talent_status.talent_status_schema import (
    TalentStatus as TalentStatusSchema,
)


class PlanScopeDefaultBase(BaseModel):
    job_group_id: int
    talent_status_id: int | None = None


class PlanScopeDefaultCreate(PlanScopeDefaultBase):
    pass


class PlanScopeDefault(PlanScopeDefaultBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    job_group: JobGroupSchema | None = None
    talent_status: TalentStatusSchema | None = None
