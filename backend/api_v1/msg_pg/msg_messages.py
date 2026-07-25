from backend.api_v1.base.errors import AlreadyExistsError, NotFoundError


class MsgNotFound(NotFoundError):
    message_key = "msgNotFound"

    def __init__(self, msg_id: int) -> None:
        self.template_vars = {"msgId": msg_id}
        self.fallback = f"Message with ID {msg_id} not found"
        super().__init__("Msg", "id", msg_id)


class MsgAlreadyExists(AlreadyExistsError):
    message_key = "msgAlreadyExists"

    def __init__(self, msg_key_id: int, lang_id: int) -> None:
        self.template_vars = {"msgKeyId": msg_key_id, "langId": lang_id}
        self.fallback = (
            f"Message for key ID {msg_key_id} and lang ID {lang_id} already exists"
        )
        super().__init__("Msg", "msg_key_id+lang_id", f"{msg_key_id}+{lang_id}")
