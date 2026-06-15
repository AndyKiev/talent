from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    DomainError,
    DeleteError,
)


class ProcessRoleNotFound(NotFoundError):
    message_key = "processRoleNotFound"

    def __init__(self, role_id: int) -> None:
        self.template_vars = {"id": role_id}
        self.fallback = f"Process role with ID {role_id} not found"
        super().__init__("ProcessRole", "id", role_id)


class ProcessRoleNameTaken(AlreadyExistsError):
    message_key = "processRoleNameTaken"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Role '{name}' already exists in this process"
        super().__init__("ProcessRole", "name", name)


class ProcessRoleDeleteError(DeleteError):
    message_key = "processRoleDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Role '{name}' cannot be deleted because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)
