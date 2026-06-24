from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


class EmployeeEventStatusDeleteSuccess(DeleteSuccess):
    message_key = "employeeEventStatusDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Employee event status '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class EmployeeEventStatusCreateSuccess(CreateSuccess):
    message_key = "employeeEventStatusCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Employee event status '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class EmployeeEventStatusUpdateSuccess(UpdateSuccess):
    message_key = "employeeEventStatusUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Employee event status '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
