from backend.api_v1.base.errors import NotFoundError, DomainError, DeleteError


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
