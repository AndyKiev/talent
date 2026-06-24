# backend/api_v1/employee_user_group_link/employee_user_group_link_success.py
from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
)


class EmployeeUserGroupLinkCreateSuccess(CreateSuccess):
    message_key = "employeeUserGroupLinkCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Group '{name}' successfully assigned"
        DomainSuccess.__init__(self, self.fallback)


class EmployeeUserGroupLinkDeleteSuccess(DeleteSuccess):
    message_key = "employeeUserGroupLinkDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Group '{name}' successfully removed"
        DomainSuccess.__init__(self, self.fallback)
