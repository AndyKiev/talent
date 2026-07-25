
from backend.api_v1.base.errors import (
    DeleteError,
    DomainError,
    NotFoundError,
)
from backend.api_v1.base.success import (
    CreateSuccess,
    DeleteSuccess,
    DomainSuccess,
    UpdateSuccess,
)


class EmployeeOrgUnitDepartmentNotFound(NotFoundError):
    message_key = "employeeOrgUnitDepartmentNotFound"

    def __init__(self, link_id: int) -> None:
        self.template_vars = {"linkId": link_id}
        self.fallback = f"Assignment with ID {link_id} not found"
        super().__init__("EmployeeOrgUnitDepartment", "id", link_id)


class EmployeeDepartmentDeleteError(DeleteError):
    message_key = "employeeDepartmentDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Assignment '{name}' cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)


class EmployeeDepartmentMainAlreadyExistsError(DomainError):
    """Raised when creating a main department while one already exists."""

    message_key = "employeeDepartmentMainAlreadyExists"

    def __init__(
        self, employee_id: int, existing_main_id: int | None = None
    ) -> None:
        self.template_vars = {
            "employeeId": employee_id,
            "existingMainId": existing_main_id or 0,
        }
        self.fallback = (
            f"Employee {employee_id} already has a main department. "
            f"Only one main department allowed."
        )
        super().__init__(self.fallback)


class EmployeeOrgUnitDepartmentDeleteSuccess(DeleteSuccess):
    message_key = "employeeOrgUnitDepartmentDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Assignment '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class EmployeeOrgUnitDepartmentCreateSuccess(CreateSuccess):
    message_key = "employeeOrgUnitDepartmentCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Assignment '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class EmployeeOrgUnitDepartmentUpdateSuccess(UpdateSuccess):
    message_key = "employeeOrgUnitDepartmentUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Assignment '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
