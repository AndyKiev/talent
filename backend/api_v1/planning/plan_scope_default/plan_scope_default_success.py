from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
)


class PlanScopeDefaultCreateSuccess(CreateSuccess):
    message_key = "planScopeDefaultCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Scope profile '{name}' added to planning defaults"
        DomainSuccess.__init__(self, self.fallback)


class PlanScopeDefaultDeleteSuccess(DeleteSuccess):
    message_key = "planScopeDefaultDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Scope profile '{name}' removed from planning defaults"
        DomainSuccess.__init__(self, self.fallback)
