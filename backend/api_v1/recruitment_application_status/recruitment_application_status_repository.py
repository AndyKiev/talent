from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.recruitment_application_status.recruitment_application_status_model import (
    RecruitmentApplicationStatus,
)


class RecruitmentApplicationStatusRepository(BaseRepository):
    model = RecruitmentApplicationStatus
