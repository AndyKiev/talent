from backend.api_v1.base.errors import NotFoundError, DomainError, AlreadyExistsError
from backend.api_v1.base.success import DomainSuccess


class ReviewSessionEmployeeNotFound(NotFoundError):
    message_key = "reviewSessionEmployeeNotFound"

    def __init__(self, rse_id: int) -> None:
        self.template_vars = {"typeId": rse_id}
        self.fallback = f"Review session employee with ID {rse_id} not found"
        super().__init__("ReviewSessionEmployee", "id", rse_id)


class ReviewSessionEmployeeStatusKeyNotFound(NotFoundError):
    """The seeded lifecycle status is missing — a setup error, not a user error:
    no review record can be created or moved without it."""

    message_key = "reviewSessionEmployeeStatusKeyNotFound"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = (
            f"Review record status '{key}' is missing — run the seed that "
            f"creates the review-record statuses"
        )
        super().__init__("ReviewSessionEmployeeStatus", "key", key)


class ReviewSessionEmployeeFeedbackTypeNotFound(NotFoundError):
    message_key = "reviewSessionEmployeeFeedbackTypeNotFound"

    def __init__(self, type_id: int) -> None:
        self.template_vars = {"typeId": type_id}
        self.fallback = f"Feedback type with ID {type_id} not found"
        super().__init__("ReviewSessionEmployeeFeedbackType", "id", type_id)


class ReviewSessionEmployeeStatusError(DomainError):
    message_key = "reviewSessionEmployeeStatusError"

    def __init__(self, current: str, target: str) -> None:
        self.template_vars = {"current": current, "target": target}
        self.fallback = f"Cannot change RSE status from '{current}' to '{target}'"
        super().__init__(self.fallback)


class ReviewSessionEmployeeAlreadyInSession(AlreadyExistsError):
    message_key = "reviewSessionEmployeeAlreadyInSession"

    def __init__(self, employee_name: str) -> None:
        self.template_vars = {"name": employee_name}
        self.fallback = f"'{employee_name}' is already in this session"
        super().__init__("ReviewSessionEmployee", "employee", employee_name)


class ReviewSessionEmployeeNotHuman(DomainError):
    message_key = "reviewOnlyHumanEmployees"

    def __init__(self, employee_name: str) -> None:
        self.template_vars = {"name": employee_name}
        self.fallback = (
            f"'{employee_name}' is not a human employee and cannot join a review"
        )
        super().__init__(self.fallback)


class ReviewSessionReorderNotAllowed(DomainError):
    message_key = "reviewSessionReorderNotAllowed"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Only an oversight reviewer can reorder the presentation queue"
        super().__init__(self.fallback)


class ReviewSessionNotOpenForAdd(DomainError):
    message_key = "reviewSessionNotOpenForAdd"

    def __init__(self, status: str) -> None:
        self.template_vars = {"status": status}
        self.fallback = f"Cannot add employees to a session in '{status}' status"
        super().__init__(self.fallback)


class ProposedLevelRequiredForReview(DomainError):
    """Block open→reviewed when the employee has a current level but no proposed
    level: the review must either confirm or change the existing level."""

    message_key = "proposedLevelRequiredForReview"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = (
            "A proposed level is required before this review can be marked "
            "reviewed (confirm the current level or propose a new one)"
        )
        super().__init__(self.fallback)


class ProposedLevelDetailsIncomplete(DomainError):
    """Block open→reviewed when the proposed level keeps/raises the current level
    but not every requirement of that level has been justified."""

    message_key = "proposedLevelDetailsIncomplete"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = (
            "Fill in the details for every requirement of the proposed level "
            "before marking this review reviewed"
        )
        super().__init__(self.fallback)


class ReviewSessionEmployeeStatusChangeSuccess(DomainSuccess):
    message_key = "reviewSessionEmployeeStatusChanged"

    def __init__(self, employee_name: str, new_status: str) -> None:
        self.template_vars = {"name": employee_name, "status": new_status}
        self.fallback = f"Review for '{employee_name}' changed to '{new_status}'"
        super().__init__(self.fallback)


class ReviewSessionEmployeeAddedSuccess(DomainSuccess):
    message_key = "reviewSessionEmployeeAdded"

    def __init__(self, employee_name: str) -> None:
        self.template_vars = {"name": employee_name}
        self.fallback = f"'{employee_name}' added to the session"
        super().__init__(self.fallback)


class ReviewSessionEmployeeQueueOrderSuccess(DomainSuccess):
    message_key = "reviewSessionEmployeeQueueOrdered"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Presentation queue order saved"
        super().__init__(self.fallback)
