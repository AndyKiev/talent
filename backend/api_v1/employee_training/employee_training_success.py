from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


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
