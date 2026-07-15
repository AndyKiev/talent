from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    DomainError,
    DeleteError,
)
from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


class CandidateSourceNotFound(NotFoundError):
    message_key = "candidateSourceNotFound"

    def __init__(self, source_id: int) -> None:
        self.template_vars = {"id": source_id}
        self.fallback = f"Candidate source with ID {source_id} not found"
        super().__init__("CandidateSource", "id", source_id)


class CandidateSourceKeyTaken(AlreadyExistsError):
    message_key = "candidateSourceKeyTaken"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Candidate source with key '{key}' already exists"
        super().__init__("CandidateSource", "key", key)


class CandidateSourceDeleteError(DeleteError):
    message_key = "candidateSourceDeleteError"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = (
            f"Candidate source '{key}' cannot be deleted because it is "
            f"referenced by candidates"
        )
        DomainError.__init__(self, self.fallback)


class CandidateSourceDeleteSuccess(DeleteSuccess):
    message_key = "candidateSourceDeleteSuccess"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Candidate source '{key}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class CandidateSourceCreateSuccess(CreateSuccess):
    message_key = "candidateSourceCreateSuccess"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Candidate source '{key}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class CandidateSourceUpdateSuccess(UpdateSuccess):
    message_key = "candidateSourceUpdateSuccess"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Candidate source '{key}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
