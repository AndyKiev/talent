from backend.api_v1.base.errors import (
    AlreadyExistsError,
    DeleteError,
    DomainError,
    NotFoundError,
)
from backend.api_v1.base.success import (
    CreateSuccess,
    DeleteSuccess,
    DomainSuccess,
    UpdateSuccess,
)


class RecruitmentCandidateNotFound(NotFoundError):
    message_key = "candidateNotFound"

    def __init__(self, candidate_id: int) -> None:
        self.template_vars = {"id": candidate_id}
        self.fallback = f"Candidate with ID {candidate_id} not found"
        super().__init__("RecruitmentCandidate", "id", candidate_id)


class RecruitmentCandidateEmailTaken(AlreadyExistsError):
    message_key = "candidateEmailTaken"

    def __init__(self, email: str) -> None:
        self.template_vars = {"email": email}
        self.fallback = f"A candidate with email '{email}' already exists"
        super().__init__("RecruitmentCandidate", "email", email)


class RecruitmentCandidateDeleteError(DeleteError):
    message_key = "candidateDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"RecruitmentCandidate '{name}' cannot be deleted"
        DomainError.__init__(self, self.fallback)


class RecruitmentCandidateDeleteSuccess(DeleteSuccess):
    message_key = "candidateDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"RecruitmentCandidate '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class RecruitmentCandidateCreateSuccess(CreateSuccess):
    message_key = "candidateCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"RecruitmentCandidate '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class RecruitmentCandidateUpdateSuccess(UpdateSuccess):
    message_key = "candidateUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"RecruitmentCandidate '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
