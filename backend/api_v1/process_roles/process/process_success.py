from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


class ProcessCreateSuccess(CreateSuccess):
    message_key = "processCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Process '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class ProcessUpdateSuccess(UpdateSuccess):
    message_key = "processUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Process '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)


class ProcessDeleteSuccess(DeleteSuccess):
    message_key = "processDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Process '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)
