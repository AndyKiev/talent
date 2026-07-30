from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.recruitment_candidate_note.recruitment_candidate_note_model import (
    RecruitmentCandidateNote,
)


class RecruitmentCandidateNoteRepository(BaseRepository):
    model = RecruitmentCandidateNote
