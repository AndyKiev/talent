from backend.api_v1.base.errors import NotFoundError
from backend.api_v1.base.success import DomainSuccess, CreateSuccess


class CandidateNoteNotFound(NotFoundError):
    message_key = "candidateNoteNotFound"

    def __init__(self, note_id: int) -> None:
        self.template_vars = {"id": note_id}
        self.fallback = f"Candidate note with ID {note_id} not found"
        super().__init__("CandidateNote", "id", note_id)


class CandidateNoteCreateSuccess(CreateSuccess):
    message_key = "candidateNoteCreateSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Note added"
        DomainSuccess.__init__(self, self.fallback)
