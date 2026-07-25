import datetime

from pydantic import BaseModel, ConfigDict

from backend.api_v1.talent_audit_interview_job.talent_audit_interview_job_schema import (
    TalentAuditInterviewJob as TalentAuditInterviewJobSchema,
)
from backend.api_v1.talent_audit_interview_job.talent_audit_interview_job_schema import (
    TalentAuditInterviewJobCreate,
)


class TalentAuditInterviewBase(BaseModel):
    talent_audit_id: int
    status_id: int
    interview_date: datetime.date


class TalentAuditInterviewCreate(TalentAuditInterviewBase):
    """
    Payload from the frontend: interview header + per-job assessments.
    The service creates the interview, then bulk-creates interview_job rows.
    """

    job_assessments: list[TalentAuditInterviewJobCreate]


class TalentAuditInterviewUpdate(BaseModel):
    status_id: int | None = None
    interview_date: datetime.date | None = None


class TalentAuditInterview(TalentAuditInterviewBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_by: int
    created_at: datetime.datetime
    interview_jobs: list[TalentAuditInterviewJobSchema] = []
