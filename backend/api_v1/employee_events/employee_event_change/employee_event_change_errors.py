from backend.api_v1.base.errors import (
    NotFoundError,
    DomainError,
    DeleteError,
)


class EmployeeEventChangeNotFound(NotFoundError):
    message_key = "employeeEventChangeNotFound"

    def __init__(self, change_id: int) -> None:
        self.template_vars = {"changeId": change_id}
        self.fallback = f"Employee event change with ID {change_id} not found"
        super().__init__("EmployeeEventChange", "id", change_id)


class EmployeeEventChangeDeleteError(DeleteError):
    message_key = "employeeEventChangeDeleteError"

    def __init__(self, change_id: int) -> None:
        self.template_vars = {"changeId": change_id}
        self.fallback = (
            f"Employee event change with ID {change_id} cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)


class EmployeeEventChangeEventNotDraft(DomainError):
    message_key = "employeeEventChangeEventNotDraft"

    def __init__(self, event_id: int) -> None:
        self.template_vars = {"eventId": event_id}
        self.fallback = (
            f"Cannot modify changes on event with ID {event_id} "
            f"because it is not in draft status"
        )
        super().__init__(self.fallback)


class EmployeeEventChangeDirectionDuplicate(DomainError):
    message_key = "employeeEventChangeDirectionDuplicate"

    def __init__(self, direction_type_id: int, event_id: int) -> None:
        self.template_vars = {
            "directionTypeId": direction_type_id,
            "eventId": event_id,
        }
        self.fallback = (
            f"A change for direction type ID {direction_type_id} already exists "
            f"on event ID {event_id}"
        )
        super().__init__(self.fallback)
