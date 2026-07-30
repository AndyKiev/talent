from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.recruitment_application.recruitment_application_model import (
    RecruitmentApplication,
)


class RecruitmentApplicationRepository(BaseRepository):
    model = RecruitmentApplication
