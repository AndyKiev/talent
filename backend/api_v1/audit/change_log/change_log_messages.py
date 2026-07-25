from backend.api_v1.base.errors import (
    DeleteError,
    DomainError,
    NotFoundError,
)
from backend.api_v1.base.success import (
    CreateSuccess,
    DeleteSuccess,
    DomainSuccess,
    UpdateSuccess,
)


class ChangeLogNotFound(NotFoundError):
    message_key = "changeLogNotFound"

    def __init__(self, log_id: int) -> None:
        self.template_vars = {"logId": log_id}
        self.fallback = f"Change log entry with ID {log_id} not found"
        super().__init__("ChangeLog", "id", log_id)


class ChangeLogDeleteError(DeleteError):
    message_key = "changeLogDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Change log entry '{name}' cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)


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
