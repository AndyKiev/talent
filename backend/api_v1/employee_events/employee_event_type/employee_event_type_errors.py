from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    DomainError,
    DeleteError,
)


class EmployeeEventTypeNotFound(NotFoundError):
    message_key = "employeeEventTypeNotFound"

    def __init__(self, type_id: int) -> None:
        self.template_vars = {"typeId": type_id}
        self.fallback = f"Employee event type with ID {type_id} not found"
        super().__init__("EmployeeEventType", "id", type_id)


class EmployeeEventTypeNotFoundByName(NotFoundError):
    message_key = "employeeEventTypeNotFoundByName"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Employee event type with name '{name}' not found"
        super().__init__("EmployeeEventType", "name", name)


class EmployeeEventTypeNameTaken(AlreadyExistsError):
    message_key = "employeeEventTypeNameTaken"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Employee event type with name '{name}' already exists"
        super().__init__("EmployeeEventType", "name", name)


class EmployeeEventTypeDeleteError(DeleteError):
    message_key = "employeeEventTypeDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Employee event type '{name}' cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)
