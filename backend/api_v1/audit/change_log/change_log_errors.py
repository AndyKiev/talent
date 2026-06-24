from backend.api_v1.base.errors import (
    NotFoundError,
    DomainError,
    DeleteError,
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
