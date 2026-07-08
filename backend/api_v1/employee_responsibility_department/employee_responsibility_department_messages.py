from backend.api_v1.base.errors import (
    NotFoundError,
    DomainError,
    DeleteError,
    AlreadyExistsError,
)
from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


class EmployeeResponsibilityDepartmentNotFound(NotFoundError):
    message_key = "employeeResponsibilityDepartmentNotFound"

    def __init__(self, link_id: int) -> None:
        self.template_vars = {"linkId": link_id}
        self.fallback = f"Responsibility assignment with ID {link_id} not found"
        super().__init__("EmployeeResponsibilityDepartment", "id", link_id)


class EmployeeResponsibilityDepartmentAlreadyExists(AlreadyExistsError):
    """Raised when the (employee_id, department_id) pair already exists."""

    message_key = "employeeResponsibilityDepartmentAlreadyExists"

    def __init__(self, employee_id: int, department_id: int) -> None:
        self.template_vars = {
            "employeeId": employee_id,
            "departmentId": department_id,
        }
        self.fallback = (
            f"Employee {employee_id} already has a responsibility assignment "
            f"for department {department_id}"
        )
        DomainError.__init__(self, self.fallback)


class EmployeeResponsibilityDepartmentDeleteError(DeleteError):
    message_key = "employeeResponsibilityDepartmentDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Responsibility assignment '{name}' cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)


class EmployeeResponsibilityDepartmentCreateSuccess(CreateSuccess):
    message_key = "employeeResponsibilityDepartmentCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Responsibility assignment '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class EmployeeResponsibilityDepartmentUpdateSuccess(UpdateSuccess):
    message_key = "employeeResponsibilityDepartmentUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Responsibility assignment '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)


class EmployeeResponsibilityDepartmentDeleteSuccess(DeleteSuccess):
    message_key = "employeeResponsibilityDepartmentDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Responsibility assignment '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)
