from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.recruitment_interview.recruitment_interview_model import (
    RecruitmentInterview,
)


class RecruitmentInterviewRepository(BaseRepository):
    model = RecruitmentInterview
