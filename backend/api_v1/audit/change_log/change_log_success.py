from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


class ChangeLogCreateSuccess(CreateSuccess):
    message_key = "changeLogCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Change log entry '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class ChangeLogUpdateSuccess(UpdateSuccess):
    message_key = "changeLogUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Change log entry '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)


class ChangeLogDeleteSuccess(DeleteSuccess):
    message_key = "changeLogDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Change log entry '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)
