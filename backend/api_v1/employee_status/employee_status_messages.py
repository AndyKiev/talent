from backend.api_v1.base.errors import (
    AlreadyExistsError,
    DeleteError,
    DomainError,
    NotFoundError,
)
from backend.api_v1.base.success import (
    CreateSuccess,
    DeleteSuccess,
    DomainSuccess,
    UpdateSuccess,
)


class EmployeeStatusNotFound(NotFoundError):
    message_key = "employeeStatusNotFound"

    def __init__(self, status_id: int) -> None:
        self.template_vars = {"typeId": status_id}
        self.fallback = f"Employee status with ID {status_id} not found"
        super().__init__("EmployeeStatus", "id", status_id)


class EmployeeStatusNotFoundByName(NotFoundError):
    message_key = "employeeStatusNotFoundByName"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Employee status with name '{name}' not found"
        super().__init__("EmployeeStatus", "name", name)


class EmployeeStatusNameTaken(AlreadyExistsError):
    message_key = "employeeStatusNameTaken"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Employee status with name '{name}' already exists"
        super().__init__("EmployeeStatus", "name", name)


class EmployeeStatusDeleteError(DeleteError):
    message_key = "employeeStatusDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Employee status '{name}' cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)


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
