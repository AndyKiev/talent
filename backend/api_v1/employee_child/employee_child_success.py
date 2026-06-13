from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
)


class EmployeeChildDeleteSuccess(DeleteSuccess):
    message_key = "employeeChildDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Child record '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class EmployeeChildCreateSuccess(CreateSuccess):
    message_key = "employeeChildCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Child record '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)
