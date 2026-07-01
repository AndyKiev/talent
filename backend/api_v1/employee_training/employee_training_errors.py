from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    DomainError,
    DeleteError,
)


class EmployeeTrainingNotFound(NotFoundError):
    message_key = "employeeTrainingNotFound"

    def __init__(self, employee_training_id: int) -> None:
        self.template_vars = {"employeeTrainingId": employee_training_id}
        self.fallback = f"Employee training with ID {employee_training_id} not found"
        super().__init__("EmployeeTraining", "id", employee_training_id)


class EmployeeTrainingAlreadyAssigned(AlreadyExistsError):
    message_key = "employeeTrainingAlreadyAssigned"

    def __init__(self, employee_id: int, training_type_id: int) -> None:
        self.template_vars = {
            "employeeId": employee_id,
            "trainingTypeId": training_type_id,
        }
        self.fallback = (
            f"Employee {employee_id} is already assigned training type "
            f"{training_type_id}"
        )
        super().__init__(
            "EmployeeTraining", "employee_id/training_type_id",
            f"{employee_id}/{training_type_id}",
        )


class EmployeeTrainingDeleteError(DeleteError):
    message_key = "employeeTrainingDeleteError"

    def __init__(self, employee_training_id: int) -> None:
        self.template_vars = {"employeeTrainingId": employee_training_id}
        self.fallback = (
            f"Employee training {employee_training_id} cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)
