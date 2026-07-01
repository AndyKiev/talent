from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    DomainError,
    DeleteError,
)


class AppSettingNotFound(NotFoundError):
    message_key = "appSettingNotFound"

    def __init__(self, setting_id: int) -> None:
        self.template_vars = {"id": setting_id}
        self.fallback = f"App setting with ID {setting_id} not found"
        super().__init__("AppSetting", "id", setting_id)


class AppSettingNotFoundByKey(NotFoundError):
    message_key = "appSettingNotFoundByKey"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"App setting with key '{key}' not found"
        super().__init__("AppSetting", "key", key)


class AppSettingKeyTaken(AlreadyExistsError):
    message_key = "appSettingKeyTaken"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"App setting with key '{key}' already exists"
        super().__init__("AppSetting", "key", key)


class AppSettingValueTypeMismatch(DomainError):
    message_key = "appSettingValueTypeMismatch"

    def __init__(self, type_key: str) -> None:
        self.template_vars = {"type": type_key}
        self.fallback = f"Setting value does not match its declared type '{type_key}'"
        DomainError.__init__(self, self.fallback)


class AppSettingValueBelowMin(DomainError):
    message_key = "appSettingValueBelowMin"

    def __init__(self, minimum: int = 1) -> None:
        self.template_vars = {"min": minimum}
        self.fallback = (
            f"A user-overridable numeric setting must be at least {minimum}"
        )
        DomainError.__init__(self, self.fallback)


class AppSettingDeleteError(DeleteError):
    message_key = "appSettingDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"App setting '{name}' cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)
