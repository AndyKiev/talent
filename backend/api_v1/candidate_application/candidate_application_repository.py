from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.candidate_application.candidate_application_model import (
    CandidateApplication,
)


class CandidateApplicationRepository(BaseRepository):
    model = CandidateApplication
