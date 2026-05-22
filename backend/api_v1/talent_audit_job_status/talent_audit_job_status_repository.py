from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.talent_audit_job_status.talent_audit_job_status_model import TalentAuditJobStatus


class TalentAuditJobStatusRepository(BaseRepository):
    model = TalentAuditJobStatus
