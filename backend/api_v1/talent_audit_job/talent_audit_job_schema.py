import datetime

from pydantic import BaseModel, ConfigDict


class TalentAuditJobBase(BaseModel):
    talent_audit_id: int
    target_job_id: int
    status_id: int
    talent_status_period_link_id: int


class TalentAuditJobCreate(TalentAuditJobBase):
    # created_by injected from the authenticated user in the service
    pass


class TalentAuditJobUpdate(BaseModel):
    status_id: int


class TalentAuditJob(TalentAuditJobBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_by: int
    created_at: datetime.datetime
