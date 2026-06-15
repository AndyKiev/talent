from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    DomainError,
    DeleteError,
)


class ProcessRoleHolderEmployeeNotFound(NotFoundError):
    message_key = "processRoleHolderEmployeeNotFound"

    def __init__(self, link_id: int) -> None:
        self.template_vars = {"id": link_id}
        self.fallback = f"Assignment with ID {link_id} not found"
        super().__init__("ProcessRoleHolderEmployeeLink", "id", link_id)


class ProcessRoleHolderEmployeeExists(AlreadyExistsError):
    message_key = "processRoleHolderEmployeeExists"

    def __init__(self, employee: str) -> None:
        self.template_vars = {"employee": employee}
        self.fallback = (
            f"Employee '{employee}' is already assigned to a holder for this role"
        )
        super().__init__("ProcessRoleHolderEmployeeLink", "employee_id", employee)


class ProcessRoleHolderEmployeeSelf(DomainError):
    message_key = "processRoleHolderEmployeeSelf"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "A holder cannot be assigned to themselves"
        DomainError.__init__(self, self.fallback)


class ProcessRoleHolderEmployeeDeleteError(DeleteError):
    message_key = "processRoleHolderEmployeeDeleteError"

    def __init__(self, employee: str) -> None:
        self.template_vars = {"employee": employee}
        self.fallback = f"Assignment for '{employee}' cannot be deleted"
        DomainError.__init__(self, self.fallback)
