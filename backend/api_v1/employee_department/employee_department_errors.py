from backend.api_v1.base.errors import (
    NotFoundError,
    DomainError,
    DeleteError,
    AlreadyExistsError,
)


class EmployeeOrgUnitDepartmentNotFound(NotFoundError):
    message_key = "employeeOrgUnitDepartmentNotFound"

    def __init__(self, link_id: int) -> None:
        self.template_vars = {"linkId": link_id}
        self.fallback = f"Assignment with ID {link_id} not found"
        super().__init__("EmployeeOrgUnitDepartment", "id", link_id)


class EmployeeDepartmentAlreadyExists(AlreadyExistsError):
    """
    Raised when the (employee_id, department_id) triple
    already exists — either on create or after a partial update.
    """

    message_key = "employeeDepartmentAlreadyExists"

    def __init__(self, employee_id: int, department_id: int) -> None:
        self.template_vars = {
            "employeeId": employee_id,
            "departmentId": department_id,
        }
        self.fallback = (
            f"Employee {employee_id} already has an assignment "
            f"for department {department_id}"
        )
        DomainError.__init__(self, self.fallback)


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
    """Raised when trying to set is_main=True but a main department already exists."""

    message_key = "employeeDepartmentMainAlreadyExists"

    def __init__(self, employee_id: int, existing_main_id: int) -> None:
        self.template_vars = {
            "employeeId": employee_id,
            "existingMainId": existing_main_id,
        }
        self.fallback = (
            f"Employee {employee_id} already has a main department "
            f"(assignment ID: {existing_main_id}). Only one main department allowed."
        )
        super().__init__(self.fallback)


class EmployeeDepartmentMainDeleteError(DomainError):
    """Raised when trying to delete a main department."""

    message_key = "employeeDepartmentMainDeleteError"

    def __init__(self, link_id: int) -> None:
        self.template_vars = {"linkId": link_id}
        self.fallback = (
            f"Cannot delete main department assignment (ID: {link_id}). "
            f"Please set another department as main first."
        )
        super().__init__(self.fallback)
