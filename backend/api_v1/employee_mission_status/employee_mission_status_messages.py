from backend.api_v1.base.errors import NotFoundError
from backend.api_v1.base.success import DomainSuccess


class EmployeeMissionStatusNotFound(NotFoundError):
    message_key = "employeeMissionStatusNotFound"

    def __init__(self, status_id: int) -> None:
        self.template_vars = {"statusId": status_id}
        self.fallback = f"Mission status with ID {status_id} not found"
        super().__init__("EmployeeMissionStatus", "id", status_id)


class EmployeeMissionStatusCreateSuccess(DomainSuccess):
    message_key = "employeeMissionStatusCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Mission status '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class EmployeeMissionStatusUpdateSuccess(DomainSuccess):
    message_key = "employeeMissionStatusUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Mission status '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
