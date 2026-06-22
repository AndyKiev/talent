from backend.api_v1.base.success import DomainSuccess, DeleteSuccess, CreateSuccess, UpdateSuccess


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
