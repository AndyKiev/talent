from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.talent_audit_interview_status.talent_audit_interview_status_model import (
    TalentAuditInterviewStatus,
)


class TalentAuditInterviewStatusRepository(BaseRepository):
    model = TalentAuditInterviewStatus
