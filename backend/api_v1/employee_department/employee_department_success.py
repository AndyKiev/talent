from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


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
