from backend.api_v1.base.errors import (
    NotFoundError,
    DomainError,
    DeleteError,
)


class ChangeSessionNotFound(NotFoundError):
    message_key = "changeSessionNotFound"

    def __init__(self, session_id: int) -> None:
        self.template_vars = {"sessionId": session_id}
        self.fallback = f"Change session with ID {session_id} not found"
        super().__init__("ChangeSession", "id", session_id)


class ChangeSessionDeleteError(DeleteError):
    message_key = "changeSessionDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Change session '{name}' cannot be deleted "
            f"because it is referenced by log entries"
        )
        DomainError.__init__(self, self.fallback)
