from backend.api_v1.base.errors import NotFoundError, AlreadyExistsError, DeleteError
from backend.api_v1.base.success import DeleteSuccess


class MsgFullNotFound(NotFoundError):
    message_key = "msgFullNotFound"

    def __init__(self, msg_key_id: int) -> None:
        self.template_vars = {"msgKeyId": msg_key_id}
        self.fallback = f"Full message with key ID {msg_key_id} not found"
        super().__init__("MsgKey", "id", msg_key_id)


class MsgFullAlreadyExists(AlreadyExistsError):
    message_key = "msgFullAlreadyExists"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Message key '{name}' already exists"
        super().__init__("MsgKey", "name", name)


class MsgFullDeleteSuccess(DeleteSuccess):
    message_key = "msgFullDeleteSuccess"

    def __init__(self, name: str) -> None:
        super().__init__("MsgKey", name)


class MsgFullDeleteError(DeleteError):
    message_key = "msgFullDeleteError"

    def __init__(self, name: str) -> None:
        super().__init__("MsgKey", name)