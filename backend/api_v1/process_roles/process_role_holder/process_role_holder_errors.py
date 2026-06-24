from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    DomainError,
    DeleteError,
)


class ProcessRoleHolderNotFound(NotFoundError):
    message_key = "processRoleHolderNotFound"

    def __init__(self, holder_id: int) -> None:
        self.template_vars = {"id": holder_id}
        self.fallback = f"Role holder with ID {holder_id} not found"
        super().__init__("ProcessRoleHolder", "id", holder_id)


class ProcessRoleHolderExists(AlreadyExistsError):
    message_key = "processRoleHolderExists"

    def __init__(self, employee: str) -> None:
        self.template_vars = {"employee": employee}
        self.fallback = f"Employee '{employee}' already holds this role"
        super().__init__("ProcessRoleHolder", "holder_employee_id", employee)


class ProcessRoleHolderDeleteError(DeleteError):
    message_key = "processRoleHolderDeleteError"

    def __init__(self, employee: str) -> None:
        self.template_vars = {"employee": employee}
        self.fallback = f"Holder '{employee}' cannot be removed while employees are assigned to them"
        DomainError.__init__(self, self.fallback)
