from backend.api_v1.base.success import (
    DomainSuccess,
    CreateSuccess,
    UpdateSuccess,
    DeleteSuccess,
)


class HrmScopeCreateSuccess(CreateSuccess):
    message_key = "hrmScopeCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Department '{name}' successfully added to scope"
        DomainSuccess.__init__(self, self.fallback)


class HrmScopeUpdateSuccess(UpdateSuccess):
    message_key = "hrmScopeUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Scope for '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)


class HrmScopeDeleteSuccess(DeleteSuccess):
    message_key = "hrmScopeDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Department '{name}' successfully removed from scope"
        DomainSuccess.__init__(self, self.fallback)
