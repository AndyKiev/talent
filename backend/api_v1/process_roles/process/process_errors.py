from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    DomainError,
    DeleteError,
)


class ProcessNotFound(NotFoundError):
    message_key = "processNotFound"

    def __init__(self, process_id: int) -> None:
        self.template_vars = {"id": process_id}
        self.fallback = f"Process with ID {process_id} not found"
        super().__init__("Process", "id", process_id)


class ProcessNameTaken(AlreadyExistsError):
    message_key = "processNameTaken"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Process '{name}' already exists"
        super().__init__("Process", "name", name)


class ProcessDeleteError(DeleteError):
    message_key = "processDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Process '{name}' cannot be deleted because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)
