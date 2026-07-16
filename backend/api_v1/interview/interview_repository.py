from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.interview.interview_model import Interview


class InterviewRepository(BaseRepository):
    model = Interview
