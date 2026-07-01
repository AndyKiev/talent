from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


class EmployeeTrainingStatusCreateSuccess(CreateSuccess):
    message_key = "employeeTrainingStatusCreateSuccess"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Employee training status '{key}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class EmployeeTrainingStatusUpdateSuccess(UpdateSuccess):
    message_key = "employeeTrainingStatusUpdateSuccess"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Employee training status '{key}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)


class EmployeeTrainingStatusDeleteSuccess(DeleteSuccess):
    message_key = "employeeTrainingStatusDeleteSuccess"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Employee training status '{key}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)
