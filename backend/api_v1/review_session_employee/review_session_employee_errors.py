from backend.api_v1.base.errors import NotFoundError, DomainError


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
