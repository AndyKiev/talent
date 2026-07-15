from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.recruitment_task.recruitment_task_model import RecruitmentTask


class RecruitmentTaskRepository(BaseRepository):
    model = RecruitmentTask
