from backend.api_v1.base.errors import (
    NotFoundError,
    DomainError,
    DeleteError,
)


class EmployeeEventNotFound(NotFoundError):
    message_key = "employeeEventNotFound"

    def __init__(self, event_id: int) -> None:
        self.template_vars = {"eventId": event_id}
        self.fallback = f"Employee event with ID {event_id} not found"
        super().__init__("EmployeeEvent", "id", event_id)


class EmployeeEventDeleteError(DeleteError):
    message_key = "employeeEventDeleteError"

    def __init__(self, event_id: int) -> None:
        self.template_vars = {"eventId": event_id}
        self.fallback = (
            f"Employee event with ID {event_id} cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)


class EmployeeEventAlreadyApplied(DomainError):
    message_key = "employeeEventAlreadyApplied"

    def __init__(self, event_id: int) -> None:
        self.template_vars = {"eventId": event_id}
        self.fallback = f"Employee event with ID {event_id} is already applied"
        super().__init__(self.fallback)


class EmployeeEventNotDraft(DomainError):
    message_key = "employeeEventNotDraft"

    def __init__(self, event_id: int) -> None:
        self.template_vars = {"eventId": event_id}
        self.fallback = (
            f"Employee event with ID {event_id} cannot be modified "
            f"because it is not in draft status"
        )
        super().__init__(self.fallback)
