from typing import Any


class DomainError(Exception):
    """Base for all domain-level errors."""


class NotFoundError(DomainError):
    def __init__(self, model: str, field: str = "", value: Any = "") -> None:
        message = f"{model} with {field} '{value}' not found" if field else model
        super().__init__(message)
        self.model = model
        self.field = field
        self.value = value


class AlreadyExistsError(DomainError):
    def __init__(self, model: str, field: str, value) -> None:
        super().__init__(f"{model} with {field} '{value}' already exists")
        self.model = model
        self.field = field
        self.value = value


class RelationshipError(DomainError):
    """Raised when a relationship constraint is violated."""


class DeleteSuccess(DomainError):
    """Generic successful-deletion signal."""

    message_key = "essenceDeleteSuccess"

    def __init__(self, model: str, name: str) -> None:
        self.template_vars = {"essence": model, "name": name}
        self.fallback = f"{model} '{name}' successfully deleted"
        super().__init__(self.fallback)


class DeleteError(DomainError):
    """Generic deletion-blocked signal (FK constraint etc.)."""

    message_key = "essenceDeleteError"

    def __init__(self, model: str, name: str) -> None:
        self.template_vars = {"essence": model, "name": name}
        self.fallback = f"{model} '{name}' cannot be deleted because it is referenced by other records"
        super().__init__(self.fallback)
