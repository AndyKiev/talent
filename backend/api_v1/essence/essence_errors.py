# backend/api_v1/essence/essence_errors.py
from backend.api_v1.base.errors import NotFoundError, AlreadyExistsError, DeleteError, DomainError


class EssenceNotFound(NotFoundError):
    message_key = "essenceNotFound"

    def __init__(self, identifier: int | str) -> None:
        self.template_vars = {"identifier": str(identifier)}
        self.fallback = f"Essence '{identifier}' not found"
        super().__init__("Essence", "id", identifier)


class EssenceNameTaken(AlreadyExistsError):
    message_key = "essenceNameTaken"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Essence with name '{name}' already exists"
        super().__init__("Essence", "name", name)


class EssenceDeleteError(DeleteError):
    message_key = "essenceDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Essence '{name}' cannot be deleted because it is still referenced "
            "by operation-essence links. Remove all linked permissions first."
        )
        DomainError.__init__(self, self.fallback)