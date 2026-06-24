from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


class EmployeeStatusDeleteSuccess(DeleteSuccess):
    message_key = "employeeStatusDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Employee status '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class EmployeeStatusCreateSuccess(CreateSuccess):
    message_key = "employeeStatusCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Employee status '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class EmployeeStatusUpdateSuccess(UpdateSuccess):
    message_key = "employeeStatusUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Employee status '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
