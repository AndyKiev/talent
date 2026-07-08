from backend.api_v1.base.errors import (
    NotFoundError,
    DomainError,
    DeleteError,
)
from backend.api_v1.base.success import DomainSuccess, UpdateSuccess


class PlanScopeNotFound(NotFoundError):
    message_key = "planScopeNotFound"

    def __init__(self, scope_id: int) -> None:
        self.template_vars = {"scopeId": scope_id}
        self.fallback = f"Plan scope with ID {scope_id} not found"
        super().__init__("PlanScope", "id", scope_id)


class PlanScopeSessionPending(DomainError):
    """Plan values cannot be set while the session is 'pending'."""

    message_key = "planScopeSessionPending"

    def __init__(self, session_name: str) -> None:
        self.template_vars = {"sessionName": session_name}
        self.fallback = (
            f"Plan values cannot be set: session '{session_name}' is still pending. "
            f"Open the session first."
        )
        super().__init__(self.fallback)


class PlanScopeSessionClosed(DomainError):
    """Plan values cannot be changed while the session is 'closed'."""

    message_key = "planScopeSessionClosed"

    def __init__(self, session_name: str) -> None:
        self.template_vars = {"sessionName": session_name}
        self.fallback = (
            f"Plan values cannot be changed: session '{session_name}' is closed. "
            f"Revert it to open first."
        )
        super().__init__(self.fallback)


class PlanScopeInactive(DomainError):
    """Cannot edit a value on an inactive scope row."""

    message_key = "planScopeInactive"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"'{name}' is inactive and cannot be edited. "
            f"Re-sync the session to reactivate it."
        )
        super().__init__(self.fallback)


class PlanScopeDeleteError(DeleteError):
    message_key = "planScopeDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Plan scope '{name}' cannot be deleted"
        DomainError.__init__(self, self.fallback)


class PlanScopeUpdateSuccess(UpdateSuccess):
    message_key = "planScopeUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Plan value for '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)


class PlanScopeDeleteSuccess(DomainSuccess):
    message_key = "planScopeDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Plan scope '{name}' deleted"
        DomainSuccess.__init__(self, self.fallback)
