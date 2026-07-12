from backend.api_v1.base.errors import DomainError
from backend.api_v1.base.success import DomainSuccess


class OversightAssignmentNoOpenSession(DomainError):
    message_key = "oversightAssignmentNoOpenSession"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "No people review session in open state was found"
        DomainError.__init__(self, self.fallback)


class OversightAssignmentRunSuccess(DomainSuccess):
    message_key = "oversightAssignmentRunSuccess"

    def __init__(self, assigned: int, skipped: int, failed: int) -> None:
        self.template_vars = {
            "assigned": assigned,
            "skipped": skipped,
            "failed": failed,
        }
        self.fallback = (
            f"Assignment finished: {assigned} assigned, "
            f"{skipped} skipped, {failed} failed"
        )
        DomainSuccess.__init__(self, self.fallback)
