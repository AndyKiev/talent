from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    DomainError,
    DeleteError,
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
