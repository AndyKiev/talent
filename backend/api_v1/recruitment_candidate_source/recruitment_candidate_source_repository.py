from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.recruitment_candidate_source.recruitment_candidate_source_model import (
    RecruitmentCandidateSource,
)


class RecruitmentCandidateSourceRepository(BaseRepository):
    model = RecruitmentCandidateSource
