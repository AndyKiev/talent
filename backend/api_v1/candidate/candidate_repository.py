from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.candidate.candidate_model import Candidate


class CandidateRepository(BaseRepository):
    model = Candidate
