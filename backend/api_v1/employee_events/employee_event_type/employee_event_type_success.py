from backend.api_v1.base.success import DomainSuccess, DeleteSuccess, CreateSuccess, UpdateSuccess


class EmployeeEventTypeDeleteSuccess(DeleteSuccess):
    message_key = "employeeEventTypeDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Employee event type '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class EmployeeEventTypeCreateSuccess(CreateSuccess):
    message_key = "employeeEventTypeCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Employee event type '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class EmployeeEventTypeUpdateSuccess(UpdateSuccess):
    message_key = "employeeEventTypeUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Employee event type '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
