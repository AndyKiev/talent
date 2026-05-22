from backend.api_v1.base.errors import (
    NotFoundError,
    # AlreadyExistsError,
    # RelationshipError,
    # DomainError,
    # DeleteSuccess,
    # DeleteError,
)

class LangNotFound(NotFoundError):
    message_key = "langNotFound"

    def __init__(self, lang_id: int) -> None:
        self.template_vars = {"langId": lang_id}
        self.fallback = f"Job with ID {lang_id} not found"
        super().__init__("Job", "id", lang_id)


class LangNotFoundByName(NotFoundError):
    message_key = "langNotFoundByName"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Language with name '{name}' not found"
        super().__init__("Lang", "name", name)