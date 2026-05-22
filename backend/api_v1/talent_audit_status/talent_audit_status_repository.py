from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.talent_audit_status.talent_audit_status_model import TalentAuditStatus


class TalentAuditStatusRepository(BaseRepository):
    model = TalentAuditStatus
