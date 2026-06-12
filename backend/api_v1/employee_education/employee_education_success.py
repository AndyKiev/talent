from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


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
