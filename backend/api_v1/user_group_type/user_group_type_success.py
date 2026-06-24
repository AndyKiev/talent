from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


class UserGroupTypeDeleteSuccess(DeleteSuccess):
    message_key = "userGroupTypeDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"User group type '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class UserGroupTypeCreateSuccess(CreateSuccess):
    message_key = "userGroupTypeCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"User group type '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class UserGroupTypeUpdateSuccess(UpdateSuccess):
    message_key = "userGroupTypeUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"User group type '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
