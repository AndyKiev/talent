from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


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
