import datetime

from pydantic import BaseModel, ConfigDict


class TalentAuditInterviewBase(BaseModel):
    talent_audit_job_id: int
    status_id: int
    interview_date: datetime.date
    talent_status_period_link_id: int


class TalentAuditInterviewCreate(TalentAuditInterviewBase):
    # created_by injected from the authenticated user in the service
    pass


class TalentAuditInterviewUpdate(BaseModel):
    status_id: int
    interview_date: datetime.date


class TalentAuditInterview(TalentAuditInterviewBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_by: int
    created_at: datetime.datetime
