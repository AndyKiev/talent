from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


class EmployeeEventTypeDirectionDeleteSuccess(DeleteSuccess):
    message_key = "employeeEventTypeDirectionDeleteSuccess"

    def __init__(self, direction_id: int) -> None:
        self.template_vars = {"directionId": direction_id}
        self.fallback = (
            f"Employee event type direction with ID {direction_id} successfully deleted"
        )
        DomainSuccess.__init__(self, self.fallback)


class EmployeeEventTypeDirectionCreateSuccess(CreateSuccess):
    message_key = "employeeEventTypeDirectionCreateSuccess"

    def __init__(self, direction_id: int) -> None:
        self.template_vars = {"directionId": direction_id}
        self.fallback = (
            f"Employee event type direction with ID {direction_id} successfully created"
        )
        DomainSuccess.__init__(self, self.fallback)


class EmployeeEventTypeDirectionUpdateSuccess(UpdateSuccess):
    message_key = "employeeEventTypeDirectionUpdateSuccess"

    def __init__(self, direction_id: int) -> None:
        self.template_vars = {"directionId": direction_id}
        self.fallback = (
            f"Employee event type direction with ID {direction_id} successfully updated"
        )
        DomainSuccess.__init__(self, self.fallback)
