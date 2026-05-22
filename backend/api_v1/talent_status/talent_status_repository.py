from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.talent_status.talent_status_model import TalentStatus


class TalentStatusRepository(BaseRepository):

    model = TalentStatus
