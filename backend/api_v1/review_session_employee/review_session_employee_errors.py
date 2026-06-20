from backend.api_v1.base.errors import NotFoundError, DomainError, AlreadyExistsError


class ReviewSessionEmployeeNotFound(NotFoundError):
    message_key = "reviewSessionEmployeeNotFound"

    def __init__(self, rse_id: int) -> None:
        self.template_vars = {"typeId": rse_id}
        self.fallback = f"Review session employee with ID {rse_id} not found"
        super().__init__("ReviewSessionEmployee", "id", rse_id)


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
