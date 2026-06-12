from backend.api_v1.base.errors import NotFoundError, DomainError, DeleteError


class EmployeeEducationNotFound(NotFoundError):
    message_key = "employeeEducationNotFound"

    def __init__(self, education_id: int) -> None:
        self.template_vars = {"typeId": education_id}
        self.fallback = f"Education record with ID {education_id} not found"
        super().__init__("EmployeeEducation", "id", education_id)


class EmployeeEducationDeleteError(DeleteError):
    message_key = "employeeEducationDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Education record '{name}' cannot be deleted"
        DomainError.__init__(self, self.fallback)
