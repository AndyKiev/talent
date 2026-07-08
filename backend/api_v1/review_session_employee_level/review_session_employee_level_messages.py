from backend.api_v1.base.errors import DomainError, NotFoundError
from backend.api_v1.base.success import DomainSuccess, UpdateSuccess


class ProposedLevelNotFound(NotFoundError):
    message_key = "proposedLevelNotFound"

    def __init__(self, rse_id: int) -> None:
        self.template_vars = {"typeId": rse_id}
        self.fallback = f"No proposed level registered for review employee {rse_id}"
        super().__init__(
            "ReviewSessionEmployeeLevel", "review_session_employee_id", rse_id
        )


class ProposedLevelStepTooHigh(DomainError):
    """The proposed level jumps more than one rank above the current level."""

    message_key = "proposedLevelStepTooHigh"

    def __init__(self) -> None:
        self.fallback = (
            "The proposed level can be at most one level above the current level."
        )
        super().__init__(self.fallback)


class ProposedLevelSaveSuccess(UpdateSuccess):
    message_key = "proposedLevelSaveSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Proposed level saved successfully"
        DomainSuccess.__init__(self, self.fallback)


class ProposedLevelDeleteSuccess(UpdateSuccess):
    message_key = "proposedLevelDeleteSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Proposed level deleted successfully"
        DomainSuccess.__init__(self, self.fallback)


class ProposedLevelStatusUpdateSuccess(UpdateSuccess):
    message_key = "proposedLevelStatusUpdateSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Proposed level status updated"
        DomainSuccess.__init__(self, self.fallback)
