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


class EmployeeTrainingCreateSuccess(CreateSuccess):
    message_key = "employeeTrainingCreateSuccess"

    def __init__(self, training_type_name: str) -> None:
        self.template_vars = {"trainingTypeName": training_type_name}
        self.fallback = f"Training '{training_type_name}' successfully assigned"
        DomainSuccess.__init__(self, self.fallback)


class EmployeeTrainingUpdateSuccess(UpdateSuccess):
    message_key = "employeeTrainingUpdateSuccess"

    def __init__(self, training_type_name: str) -> None:
        self.template_vars = {"trainingTypeName": training_type_name}
        self.fallback = f"Training '{training_type_name}' status successfully updated"
        DomainSuccess.__init__(self, self.fallback)


class EmployeeTrainingDeleteSuccess(DeleteSuccess):
    message_key = "employeeTrainingDeleteSuccess"

    def __init__(self, training_type_name: str) -> None:
        self.template_vars = {"trainingTypeName": training_type_name}
        self.fallback = f"Training '{training_type_name}' successfully unassigned"
        DomainSuccess.__init__(self, self.fallback)
