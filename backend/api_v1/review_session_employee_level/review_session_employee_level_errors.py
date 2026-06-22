from backend.api_v1.base.errors import DomainError, NotFoundError


class ProposedLevelNotFound(NotFoundError):
    message_key = "proposedLevelNotFound"

    def __init__(self, rse_id: int) -> None:
        self.template_vars = {"typeId": rse_id}
        self.fallback = f"No proposed level registered for review employee {rse_id}"
        super().__init__("ReviewSessionEmployeeLevel", "review_session_employee_id", rse_id)


class ProposedLevelStepTooHigh(DomainError):
    """The proposed level jumps more than one rank above the current level."""

    message_key = "proposedLevelStepTooHigh"

    def __init__(self) -> None:
        self.fallback = (
            "The proposed level can be at most one level above the current level."
        )
        super().__init__(self.fallback)
