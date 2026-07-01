from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    DomainError,
    DeleteError,
)


class EmployeeTrainingStatusNotFound(NotFoundError):
    message_key = "employeeTrainingStatusNotFound"

    def __init__(self, employee_training_status_id: int) -> None:
        self.template_vars = {"employeeTrainingStatusId": employee_training_status_id}
        self.fallback = (
            f"Employee training status with ID {employee_training_status_id} not found"
        )
        super().__init__("EmployeeTrainingStatus", "id", employee_training_status_id)


class EmployeeTrainingStatusNotFoundByKey(NotFoundError):
    message_key = "employeeTrainingStatusNotFoundByKey"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Employee training status with key '{key}' not found"
        super().__init__("EmployeeTrainingStatus", "key", key)


class EmployeeTrainingStatusKeyTaken(AlreadyExistsError):
    message_key = "employeeTrainingStatusKeyTaken"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Employee training status with key '{key}' already exists"
        super().__init__("EmployeeTrainingStatus", "key", key)


class EmployeeTrainingStatusDeleteError(DeleteError):
    message_key = "employeeTrainingStatusDeleteError"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = (
            f"Employee training status '{key}' cannot be deleted because it is "
            f"referenced by other records"
        )
        DomainError.__init__(self, self.fallback)
