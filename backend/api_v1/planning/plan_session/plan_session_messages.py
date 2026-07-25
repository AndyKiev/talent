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


class PlanSessionNotFound(NotFoundError):
    message_key = "planSessionNotFound"

    def __init__(self, session_id: int) -> None:
        self.template_vars = {"sessionId": session_id}
        self.fallback = f"Plan session with ID {session_id} not found"
        super().__init__("PlanSession", "id", session_id)


class PlanSessionNameTaken(AlreadyExistsError):
    message_key = "planSessionNameTaken"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Plan session with name '{name}' already exists"
        super().__init__("PlanSession", "name", name)


class PlanSessionPeriodOverlap(DomainError):
    """New/updated date range overlaps an existing session."""

    message_key = "planSessionPeriodOverlap"

    def __init__(self, conflict_name: str) -> None:
        self.template_vars = {"conflictName": conflict_name}
        self.fallback = (
            f"The selected period overlaps with existing session '{conflict_name}'"
        )
        super().__init__(self.fallback)


class PlanSessionPendingExists(DomainError):
    """Only one pending session is allowed at a time."""

    message_key = "planSessionPendingExists"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "There is already a pending session. Only one is allowed."
        super().__init__(self.fallback)


class PlanSessionActiveLimit(DomainError):
    """No more than two active (pending + open) sessions at a time."""

    message_key = "planSessionActiveLimit"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "The maximum of two active sessions is already reached."
        super().__init__(self.fallback)


class PlanSessionRevertBlocked(DomainError):
    """Reverting to 'open' would exceed the active-session limit."""

    message_key = "planSessionRevertBlocked"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = (
            "Cannot revert: this would exceed the maximum of two active sessions."
        )
        super().__init__(self.fallback)


class PlanSessionNotClosed(DomainError):
    """Revert is only valid on a closed session."""

    message_key = "planSessionNotClosed"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Session '{name}' is not closed; nothing to revert."
        super().__init__(self.fallback)


class PlanSessionNoMatchingScopes(DomainError):
    """No department/job-group combination matched, so no plan rows would exist."""

    message_key = "planSessionNoMatchingScopes"

    def __init__(self, detail: str | None = None) -> None:
        self.template_vars = {"detail": detail or ""}
        base = (
            "No plan could be created: none of the default job groups fully match "
            "the jobs available in the selected departments. Check that every job "
            "in a planning job group is held by a department (or a descendant "
            "department) under the chosen department categories."
        )
        self.fallback = f"{base} {detail}".strip() if detail else base
        super().__init__(self.fallback)


class PlanSessionDeleteError(DeleteError):
    message_key = "planSessionDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Plan session '{name}' cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)


class PlanSessionResyncNotOpen(DomainError):
    """Re-sync is only allowed while the session is open."""

    message_key = "planSessionResyncNotOpen"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Session '{name}' must be open to re-sync. Open or revert it first."
        )
        super().__init__(self.fallback)


class PlanSessionCategoryOverlap(DomainError):
    """A department category already belongs to another session whose date
    range overlaps this one."""

    message_key = "planSessionCategoryOverlap"

    def __init__(self, category_name: str, session_name: str) -> None:
        self.template_vars = {"category": category_name, "session": session_name}
        self.fallback = (
            f"Category '{category_name}' is already planned in session "
            f"'{session_name}' for an overlapping period."
        )
        super().__init__(self.fallback)


class PlanSessionInvalidRange(DomainError):
    """End date precedes start date."""

    message_key = "planSessionInvalidRange"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Session '{name}': end date must be on or after start date."
        super().__init__(self.fallback)


class PlanSessionCreateSuccess(CreateSuccess):
    message_key = "planSessionCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Plan session '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class PlanSessionUpdateSuccess(UpdateSuccess):
    message_key = "planSessionUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Plan session '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)


class PlanSessionDeleteSuccess(DeleteSuccess):
    message_key = "planSessionDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Plan session '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class PlanSessionOpenSuccess(DomainSuccess):
    message_key = "planSessionOpenSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Plan session '{name}' is now open"
        DomainSuccess.__init__(self, self.fallback)


class PlanSessionCloseSuccess(DomainSuccess):
    message_key = "planSessionCloseSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Plan session '{name}' is now closed"
        DomainSuccess.__init__(self, self.fallback)


class PlanSessionRevertSuccess(DomainSuccess):
    message_key = "planSessionRevertSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Plan session '{name}' reverted to open"
        DomainSuccess.__init__(self, self.fallback)


class PlanSessionResyncSuccess(DomainSuccess):
    message_key = "planSessionResyncSuccess"

    def __init__(
        self, name: str, added: int, reactivated: int, deactivated: int
    ) -> None:
        self.template_vars = {
            "name": name,
            "added": added,
            "reactivated": reactivated,
            "deactivated": deactivated,
        }
        self.fallback = (
            f"Session '{name}' re-synced: {added} added, "
            f"{reactivated} reactivated, {deactivated} deactivated"
        )
        DomainSuccess.__init__(self, self.fallback)
