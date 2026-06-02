from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.planning.plan_session_status.plan_session_status_model import (
    PlanSessionStatus,
)


class PlanSessionStatusRepository(BaseRepository):
    model = PlanSessionStatus
