from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.talent_period.talent_period_model import TalentPeriod


class TalentPeriodRepository(BaseRepository):

    model = TalentPeriod
