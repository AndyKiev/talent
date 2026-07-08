from backend.api_v1.base.errors import DomainError
from backend.api_v1.base.success import DomainSuccess


class OversightRoleNotConfigured(DomainError):
    message_key = "oversightRoleNotConfigured"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "No active oversight role is configured for people review"
        DomainError.__init__(self, self.fallback)


class OversightHolderInvalid(DomainError):
    message_key = "oversightHolderInvalid"

    def __init__(self, holder_id: int) -> None:
        self.template_vars = {"id": holder_id}
        self.fallback = (
            f"The selected reviewer ({holder_id}) is not a valid oversight manager"
        )
        DomainError.__init__(self, self.fallback)


class OversightManagerSelf(DomainError):
    message_key = "oversightManagerSelf"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "You cannot pick yourself as your oversight manager"
        DomainError.__init__(self, self.fallback)


class OversightManagerSetSuccess(DomainSuccess):
    message_key = "oversightManagerSetSuccess"

    def __init__(self, manager: str) -> None:
        self.template_vars = {"manager": manager}
        self.fallback = f"Oversight manager set to '{manager}'"
        DomainSuccess.__init__(self, self.fallback)


class OversightManagerClearSuccess(DomainSuccess):
    message_key = "oversightManagerClearSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Oversight manager disconnected"
        DomainSuccess.__init__(self, self.fallback)
