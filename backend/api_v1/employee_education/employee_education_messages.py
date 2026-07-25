from backend.api_v1.base.errors import DeleteError, DomainError, NotFoundError
from backend.api_v1.base.success import (
    CreateSuccess,
    DeleteSuccess,
    DomainSuccess,
    UpdateSuccess,
)


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


class EmployeeEducationDeleteSuccess(DeleteSuccess):
    message_key = "employeeEducationDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Education record '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class EmployeeEducationCreateSuccess(CreateSuccess):
    message_key = "employeeEducationCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Education record '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class EmployeeEducationUpdateSuccess(UpdateSuccess):
    message_key = "employeeEducationUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Education record '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
