from backend.api_v1.base.errors import DeleteError, DomainError, NotFoundError
from backend.api_v1.base.success import (
    CreateSuccess,
    DeleteSuccess,
    DomainSuccess,
)


class EmployeeChildNotFound(NotFoundError):
    message_key = "employeeChildNotFound"

    def __init__(self, child_id: int) -> None:
        self.template_vars = {"typeId": child_id}
        self.fallback = f"Child record with ID {child_id} not found"
        super().__init__("EmployeeChild", "id", child_id)


class EmployeeChildDeleteError(DeleteError):
    message_key = "employeeChildDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Child record '{name}' cannot be deleted"
        DomainError.__init__(self, self.fallback)


class EmployeeChildDeleteSuccess(DeleteSuccess):
    message_key = "employeeChildDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Child record '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class EmployeeChildCreateSuccess(CreateSuccess):
    message_key = "employeeChildCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Child record '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)
