from backend.api_v1.base.errors import (
    NotFoundError,
    DomainError,
    DeleteError,
)


class EmployeeEventTypeDirectionNotFound(NotFoundError):
    message_key = "employeeEventTypeDirectionNotFound"

    def __init__(self, direction_id: int) -> None:
        self.template_vars = {"directionId": direction_id}
        self.fallback = f"Employee event type direction with ID {direction_id} not found"
        super().__init__("EmployeeEventTypeDirection", "id", direction_id)


class EmployeeEventTypeDirectionDeleteError(DeleteError):
    message_key = "employeeEventTypeDirectionDeleteError"

    def __init__(self, direction_id: int) -> None:
        self.template_vars = {"directionId": direction_id}
        self.fallback = (
            f"Employee event type direction with ID {direction_id} cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)


class EmployeeEventTypeDirectionDuplicate(DomainError):
    message_key = "employeeEventTypeDirectionDuplicate"

    def __init__(self, event_type_id: int, direction_type_id: int) -> None:
        self.template_vars = {
            "eventTypeId": event_type_id,
            "directionTypeId": direction_type_id,
        }
        self.fallback = (
            f"Direction type ID {direction_type_id} is already configured "
            f"for event type ID {event_type_id}"
        )
        super().__init__(self.fallback)
