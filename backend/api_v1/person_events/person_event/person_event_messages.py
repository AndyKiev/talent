from backend.api_v1.base.errors import DomainError, NotFoundError
from backend.api_v1.base.success import DomainSuccess

# ── Errors ────────────────────────────────────────────────────────────────────


class PersonEventNotFound(NotFoundError):
    message_key = "personEventNotFound"

    def __init__(self, event_id: int) -> None:
        self.template_vars = {"eventId": event_id}
        self.fallback = f"Person event with ID {event_id} not found"
        super().__init__("PersonEvent", "id", event_id)


class PersonEventTypeNotFound(NotFoundError):
    message_key = "personEventTypeNotFound"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Person event type '{key}' not found — run the seed"
        super().__init__("PersonEventType", "key", key)


class PersonEventNotPermittedForSex(DomainError):
    """The surname-change event is restricted to women by default (the case it
    was built for is marriage). An app setting can lift the restriction."""

    message_key = "personEventNotPermittedForSex"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "A surname change may only be recorded for a woman"
        super().__init__(self.fallback)


class PersonEventSexUnknown(DomainError):
    """persons.sex_id is nullable, so "not a woman" and "we do not know" are
    different answers and must not share a message: one is a refusal, the other
    is a missing prerequisite the user can fix."""

    message_key = "personEventSexUnknown"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Set the person's sex before recording a surname change"
        super().__init__(self.fallback)


class PersonEventOutOfScope(DomainError):
    """HRM may only record events for people inside their department scope."""

    message_key = "personEventOutOfScope"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "This person is outside your scope"
        super().__init__(self.fallback)


class PersonEventInvalidTransition(DomainError):
    message_key = "personEventInvalidTransition"

    def __init__(self, current: str, target: str) -> None:
        self.template_vars = {"current": current, "target": target}
        self.fallback = f"Cannot move a person event from '{current}' to '{target}'"
        super().__init__(self.fallback)


class PersonEventNotEditable(DomainError):
    """An applied event is history: correct it with a new event, not by editing
    the record of what already happened."""

    message_key = "personEventNotEditable"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "An applied person event can no longer be edited or deleted"
        super().__init__(self.fallback)


# ── Success ───────────────────────────────────────────────────────────────────


class PersonEventCreateSuccess(DomainSuccess):
    message_key = "personEventCreateSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Event recorded"
        super().__init__(self.fallback)


class PersonEventStatusChangeSuccess(DomainSuccess):
    message_key = "personEventStatusChangeSuccess"

    def __init__(self, status: str) -> None:
        self.template_vars = {"status": status}
        self.fallback = f"Event moved to '{status}'"
        super().__init__(self.fallback)


class PersonEventDeleteSuccess(DomainSuccess):
    message_key = "personEventDeleteSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Event deleted"
        super().__init__(self.fallback)
