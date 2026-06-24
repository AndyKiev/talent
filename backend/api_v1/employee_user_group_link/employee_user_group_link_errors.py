# backend/api_v1/employee_user_group_link/employee_user_group_link_errors.py
from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    DomainError,
    DeleteError,
)


class EmployeeUserGroupLinkNotFound(NotFoundError):
    message_key = "employeeUserGroupLinkNotFound"

    def __init__(self, link_id: int) -> None:
        self.template_vars = {"linkId": link_id}
        self.fallback = f"Employee–user group link with ID {link_id} not found"
        super().__init__("EmployeeUserGroupLink", "id", link_id)


class EmployeeUserGroupLinkAlreadyExists(AlreadyExistsError):
    message_key = "employeeUserGroupLinkAlreadyExists"

    def __init__(self, employee_id: int, user_group_id: int) -> None:
        self.template_vars = {"employeeId": employee_id, "userGroupId": user_group_id}
        self.fallback = (
            f"Link between employee ID {employee_id} "
            f"and user group ID {user_group_id} already exists"
        )
        DomainError.__init__(self, self.fallback)


class EmployeeUserGroupLinkDeleteError(DeleteError):
    message_key = "employeeUserGroupLinkDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Employee–user group link '{name}' cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)


class EmployeeUserGroupLinkNotFoundByCompositeKey(NotFoundError):
    message_key = "employeeUserGroupLinkNotFoundByCompositeKey"

    def __init__(self, employee_id: int, user_group_id: int) -> None:
        self.template_vars = {"employeeId": employee_id, "userGroupId": user_group_id}
        self.fallback = (
            f"Employee–user group link for employee ID {employee_id} "
            f"and user group ID {user_group_id} not found"
        )
        DomainError.__init__(self, self.fallback)


class EmployeeEmailRequiredForGroup(DomainError):
    """Block linking a group to an employee that has no email on file."""

    message_key = "employeeEmailRequiredForGroup"

    def __init__(self, employee_name: str) -> None:
        self.template_vars = {"name": employee_name}
        self.fallback = (
            f"Employee '{employee_name}' must have an email before being "
            f"assigned to a user group"
        )
        DomainError.__init__(self, self.fallback)
