from backend.api_v1.base.errors import DeleteError, DomainError, NotFoundError
from backend.api_v1.base.success import (
    CreateSuccess,
    DeleteSuccess,
    DomainSuccess,
    UpdateSuccess,
)


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


class ReviewSessionDeletePermission(DomainError):
    message_key = "reviewSessionDeletePermission"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Only developers can delete review sessions"
        super().__init__(self.fallback)


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


class ReviewSessionDeleteSuccess(DeleteSuccess):
    message_key = "reviewSessionDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Review session '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class ReviewSessionCreateSuccess(CreateSuccess):
    message_key = "reviewSessionCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Review session '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class ReviewSessionUpdateSuccess(UpdateSuccess):
    message_key = "reviewSessionUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Review session '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)


class ReviewSessionOpenSuccess(DomainSuccess):
    message_key = "reviewSessionOpenSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Review session '{name}' successfully opened"
        super().__init__(self.fallback)


class ReviewSessionCloseSuccess(DomainSuccess):
    message_key = "reviewSessionCloseSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Review session '{name}' successfully closed"
        super().__init__(self.fallback)


class ReviewSessionRevertSuccess(DomainSuccess):
    message_key = "reviewSessionRevertSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Review session '{name}' reverted to open"
        super().__init__(self.fallback)
