from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


class ProcessRoleCreateSuccess(CreateSuccess):
    message_key = "processRoleCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Role '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class ProcessRoleUpdateSuccess(UpdateSuccess):
    message_key = "processRoleUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Role '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)


class ProcessRoleDeleteSuccess(DeleteSuccess):
    message_key = "processRoleDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Role '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)
