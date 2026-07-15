from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.candidate_note.candidate_note_model import CandidateNote


class CandidateNoteRepository(BaseRepository):
    model = CandidateNote
