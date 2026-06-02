from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.talent_audit_interview_job.talent_audit_interview_job_model import (
    TalentAuditInterviewJob,
)


class TalentAuditInterviewJobRepository(BaseRepository):
    model = TalentAuditInterviewJob
