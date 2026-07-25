from backend.api_v1.base.errors import (
    DomainError,
    NotFoundError,
)
from backend.api_v1.base.success import (
    DeleteSuccess,
    DomainSuccess,
    UpdateSuccess,
)


class UserSettingNotFound(NotFoundError):
    message_key = "userSettingNotFound"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"You have no personal override for setting '{key}'"
        super().__init__("UserSetting", "key", key)


class UserSettingNotOverridable(DomainError):
    message_key = "userSettingNotOverridable"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Setting '{key}' cannot be overridden per user"
        DomainError.__init__(self, self.fallback)


class UserSettingValueBelowMin(DomainError):
    message_key = "userSettingValueBelowMin"

    def __init__(self, minimum: int = 1) -> None:
        self.template_vars = {"min": minimum}
        self.fallback = f"Value must be at least {minimum}"
        DomainError.__init__(self, self.fallback)


class UserSettingUpdateSuccess(UpdateSuccess):
    message_key = "userSettingUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Your preference for '{name}' was saved"
        DomainSuccess.__init__(self, self.fallback)


class UserSettingDeleteSuccess(DeleteSuccess):
    message_key = "userSettingDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Your preference for '{name}' was reset to default"
        DomainSuccess.__init__(self, self.fallback)
