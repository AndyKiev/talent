from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


class AppSettingDeleteSuccess(DeleteSuccess):
    message_key = "appSettingDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"App setting '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class AppSettingCreateSuccess(CreateSuccess):
    message_key = "appSettingCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"App setting '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class AppSettingUpdateSuccess(UpdateSuccess):
    message_key = "appSettingUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"App setting '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
