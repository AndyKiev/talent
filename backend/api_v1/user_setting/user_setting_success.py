from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    UpdateSuccess,
)


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
