from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


class OperationDeleteSuccess(DeleteSuccess):
    message_key = "operationDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Operation '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class OperationCreateSuccess(CreateSuccess):
    message_key = "operationCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Operation '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class OperationUpdateSuccess(UpdateSuccess):
    message_key = "operationUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Operation '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
