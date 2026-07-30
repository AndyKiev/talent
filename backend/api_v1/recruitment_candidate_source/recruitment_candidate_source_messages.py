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


class RecruitmentCandidateSourceNotFound(NotFoundError):
    message_key = "candidateSourceNotFound"

    def __init__(self, candidate_source_id: int) -> None:
        self.template_vars = {"id": candidate_source_id}
        self.fallback = f"Candidate source with ID {candidate_source_id} not found"
        super().__init__("RecruitmentCandidateSource", "id", candidate_source_id)


class RecruitmentCandidateSourceKeyTaken(AlreadyExistsError):
    message_key = "candidateSourceKeyTaken"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Candidate source with key '{key}' already exists"
        super().__init__("RecruitmentCandidateSource", "key", key)


class RecruitmentCandidateSourceDeleteError(DeleteError):
    message_key = "candidateSourceDeleteError"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = (
            f"Candidate source '{key}' cannot be deleted because it is "
            f"referenced by candidates"
        )
        DomainError.__init__(self, self.fallback)


class RecruitmentCandidateSourceDeleteSuccess(DeleteSuccess):
    message_key = "candidateSourceDeleteSuccess"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Candidate source '{key}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class RecruitmentCandidateSourceCreateSuccess(CreateSuccess):
    message_key = "candidateSourceCreateSuccess"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Candidate source '{key}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class RecruitmentCandidateSourceUpdateSuccess(UpdateSuccess):
    message_key = "candidateSourceUpdateSuccess"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Candidate source '{key}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
