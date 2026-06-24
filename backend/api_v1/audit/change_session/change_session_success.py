from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


class ChangeSessionCreateSuccess(CreateSuccess):
    message_key = "changeSessionCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Change session '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class ChangeSessionUpdateSuccess(UpdateSuccess):
    message_key = "changeSessionUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Change session '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)


class ChangeSessionDeleteSuccess(DeleteSuccess):
    message_key = "changeSessionDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Change session '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)
