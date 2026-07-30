from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.recruitment_candidate.recruitment_candidate_model import (
    RecruitmentCandidate,
)


class RecruitmentCandidateRepository(BaseRepository):
    model = RecruitmentCandidate
