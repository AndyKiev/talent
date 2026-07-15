from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.recruitment_task_status.recruitment_task_status_model import (
    RecruitmentTaskStatus,
)


class RecruitmentTaskStatusRepository(BaseRepository):
    model = RecruitmentTaskStatus
