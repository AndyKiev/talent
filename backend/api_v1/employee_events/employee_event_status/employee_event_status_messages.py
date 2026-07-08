from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    DomainError,
    DeleteError,
)
from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


class EmployeeEventStatusNotFound(NotFoundError):
    message_key = "employeeEventStatusNotFound"

    def __init__(self, status_id: int) -> None:
        self.template_vars = {"statusId": status_id}
        self.fallback = f"Employee event status with ID {status_id} not found"
        super().__init__("EmployeeEventStatus", "id", status_id)


class EmployeeEventStatusNotFoundByName(NotFoundError):
    message_key = "employeeEventStatusNotFoundByName"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Employee event status with name '{name}' not found"
        super().__init__("EmployeeEventStatus", "name", name)


class EmployeeEventStatusNameTaken(AlreadyExistsError):
    message_key = "employeeEventStatusNameTaken"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Employee event status with name '{name}' already exists"
        super().__init__("EmployeeEventStatus", "name", name)


class EmployeeEventStatusDeleteError(DeleteError):
    message_key = "employeeEventStatusDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Employee event status '{name}' cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)


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
