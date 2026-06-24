from backend.api_v1.base.errors import (
    NotFoundError,
    # AlreadyExistsError,
    # RelationshipError,
    # DomainError,
    # DeleteSuccess,
    # DeleteError,
)


class MsgKeyNotFound(NotFoundError):
    message_key = "msgKeyNotFound"

    def __init__(self, mag_key_id: int) -> None:
        self.template_vars = {"msgKeyId": mag_key_id}
        self.fallback = f"Message key with ID {mag_key_id} not found"
        super().__init__("MsgKey", "id", mag_key_id)


class MsgKeyNotFoundByName(NotFoundError):
    message_key = "msgKeyNotFoundByName"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Message key with name '{name}' not found"
        super().__init__("MsgKey", "name", name)
