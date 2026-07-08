from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    DomainError,
    DeleteError,
)
from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


class SettingValueTypeNotFound(NotFoundError):
    message_key = "settingValueTypeNotFound"

    def __init__(self, type_id: int) -> None:
        self.template_vars = {"id": type_id}
        self.fallback = f"Setting value type with ID {type_id} not found"
        super().__init__("SettingValueType", "id", type_id)


class SettingValueTypeKeyTaken(AlreadyExistsError):
    message_key = "settingValueTypeKeyTaken"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Setting value type with key '{key}' already exists"
        super().__init__("SettingValueType", "key", key)


class SettingValueTypeDeleteError(DeleteError):
    message_key = "settingValueTypeDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Setting value type '{name}' cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)


class SettingValueTypeDeleteSuccess(DeleteSuccess):
    message_key = "settingValueTypeDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Setting value type '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class SettingValueTypeCreateSuccess(CreateSuccess):
    message_key = "settingValueTypeCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Setting value type '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class SettingValueTypeUpdateSuccess(UpdateSuccess):
    message_key = "settingValueTypeUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Setting value type '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
