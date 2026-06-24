from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    DeleteError,
)


class ProcessRoleHolderDepartmentNotFound(NotFoundError):
    message_key = "processRoleHolderDepartmentNotFound"

    def __init__(self, link_id: int) -> None:
        self.template_vars = {"id": link_id}
        self.fallback = f"Department assignment with ID {link_id} not found"
        super().__init__("ProcessRoleHolderDepartmentLink", "id", link_id)


class ProcessRoleHolderDepartmentExists(AlreadyExistsError):
    message_key = "processRoleHolderDepartmentExists"

    def __init__(self, department: str) -> None:
        self.template_vars = {"department": department}
        self.fallback = f"Department '{department}' is already assigned to this holder"
        super().__init__("ProcessRoleHolderDepartmentLink", "department_id", department)


class ProcessRoleHolderDepartmentDeleteError(DeleteError):
    message_key = "processRoleHolderDepartmentDeleteError"

    def __init__(self, department: str) -> None:
        self.template_vars = {"department": department}
        self.fallback = f"Assignment for '{department}' cannot be deleted"
        from backend.api_v1.base.errors import DomainError

        DomainError.__init__(self, self.fallback)
