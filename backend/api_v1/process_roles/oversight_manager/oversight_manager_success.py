from backend.api_v1.base.success import DomainSuccess


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
