from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


class MenuCreateSuccess(CreateSuccess):
    message_key = "menuCreateSuccess"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Menu '{key}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class MenuUpdateSuccess(UpdateSuccess):
    message_key = "menuUpdateSuccess"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Menu '{key}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)


class MenuDeleteSuccess(DeleteSuccess):
    message_key = "menuDeleteSuccess"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Menu '{key}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)
