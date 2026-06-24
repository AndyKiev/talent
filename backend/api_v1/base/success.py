from backend.api_v1.base.errors import DomainError


class DomainSuccess(Exception):
    """Base for all domain-level successes."""


class DeleteSuccess(DomainSuccess):
    """Generic successful-deletion signal."""

    message_key = "essenceDeleteSuccess"

    def __init__(self, model: str, name: str) -> None:
        self.template_vars = {"essence": model, "name": name}
        self.fallback = f"{model} '{name}' successfully deleted"
        super().__init__(self.fallback)


class CreateSuccess(DomainSuccess):
    """Generic successful-creation signal."""

    message_key = "essenceCreateSuccess"

    def __init__(self, model: str, name: str) -> None:
        self.template_vars = {"essence": model, "name": name}
        self.fallback = f"{model} '{name}' successfully created"
        super().__init__(self.fallback)


class UpdateSuccess(DomainSuccess):
    """Generic successful-update signal."""

    message_key = "essenceUpdateSuccess"

    def __init__(self, model: str, name: str) -> None:
        self.template_vars = {"essence": model, "name": name}
        self.fallback = f"{model} '{name}' successfully updated"
        super().__init__(self.fallback)
