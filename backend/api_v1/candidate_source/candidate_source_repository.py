from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.candidate_source.candidate_source_model import CandidateSource


class CandidateSourceRepository(BaseRepository):
    model = CandidateSource
