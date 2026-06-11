from backend.api_v1.base.errors import NotFoundError, DomainError, DeleteError


class ReviewSessionNotFound(NotFoundError):
    message_key = "reviewSessionNotFound"

    def __init__(self, session_id: int) -> None:
        self.template_vars = {"typeId": session_id}
        self.fallback = f"Review session with ID {session_id} not found"
        super().__init__("ReviewSession", "id", session_id)


class ReviewSessionDeleteError(DeleteError):
    message_key = "reviewSessionDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Review session '{name}' cannot be deleted "
            f"because it has employee reviews"
        )
        DomainError.__init__(self, self.fallback)


class ReviewSessionStatusError(DomainError):
    message_key = "reviewSessionStatusError"

    def __init__(self, current: str, target: str) -> None:
        self.template_vars = {"current": current, "target": target}
        self.fallback = f"Cannot change status from '{current}' to '{target}'"
        super().__init__(self.fallback)


class ReviewSessionCannotCloseError(DomainError):
    message_key = "reviewSessionCannotClose"

    def __init__(self, pending_count: int) -> None:
        self.template_vars = {"count": pending_count}
        self.fallback = (
            f"Cannot close session: {pending_count} employee review(s) "
            f"are not yet closed"
        )
        super().__init__(self.fallback)
