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


class EmployeeEventInvalidStatusTransition(DomainError):
    message_key = "employeeEventInvalidStatusTransition"

    def __init__(self, current: str, target: str, event_id: int) -> None:
        self.template_vars = {
            "current": current,
            "target": target,
            "eventId": event_id,
        }
        self.fallback = (
            f"Cannot apply event {event_id}: illegal status transition "
            f"from '{current}' to '{target}'"
        )
        super().__init__(self.fallback)


class EmployeeEventOpenEventExists(DomainError):
    message_key = "employeeEventOpenEventExists"

    def __init__(self, employee_id: int) -> None:
        self.template_vars = {"employeeId": employee_id}
        self.fallback = (
            "This employee already has an open (draft or ready) event. "
            "Apply it before creating a new one."
        )
        super().__init__(self.fallback)


class EmployeeEventActivationExists(DomainError):
    message_key = "employeeEventActivationExists"

    def __init__(self, employee_id: int) -> None:
        self.template_vars = {"employeeId": employee_id}
        self.fallback = "This employee already has an activation event."
        super().__init__(self.fallback)


class EmployeeEventActivationRequired(DomainError):
    message_key = "employeeEventActivationRequired"

    def __init__(self, employee_id: int) -> None:
        self.template_vars = {"employeeId": employee_id}
        self.fallback = "The first event for an employee must be an activation event."
        super().__init__(self.fallback)


class EmployeeEventDateTaken(DomainError):
    message_key = "employeeEventDateTaken"

    def __init__(self, employee_id: int, effective_date) -> None:
        self.template_vars = {
            "employeeId": employee_id,
            "date": str(effective_date),
        }
        self.fallback = (
            f"Employee {employee_id} already has an event dated {effective_date}. "
            f"Each event must have a unique effective date."
        )
        super().__init__(self.fallback)


class EmployeeEventNotLatest(DomainError):
    message_key = "employeeEventNotLatest"

    def __init__(self, event_id: int) -> None:
        self.template_vars = {"eventId": event_id}
        self.fallback = (
            f"Event {event_id} is not the latest event (by effective date) and "
            f"cannot be deleted. Delete the most recent event first."
        )
        super().__init__(self.fallback)


class EmployeeEventJobNotAlignedWithTalent(DomainError):
    """Raised when a job-changing event (any event carrying a JOB_CHANGE) targets
    a job that is not one of the employee's OPEN talent target jobs, while the
    `allow_unaligned_events` app setting is OFF (False). The message names the
    setting so an admin knows the toggle that controls this rule."""

    message_key = "employeeEventJobNotAlignedWithTalent"

    def __init__(self, employee_id: int, job_id: int, setting_key: str) -> None:
        self.template_vars = {
            "employeeId": employee_id,
            "jobId": job_id,
            "setting": setting_key,
        }
        self.fallback = (
            f"This event changes the employee to a job (#{job_id}) that is not in "
            f"their talent plan. Creating job-change events that are not aligned "
            f"with the employee's talent status is currently disabled by the "
            f"'{setting_key}' setting — an admin can enable that setting to allow it."
        )
        super().__init__(self.fallback)
