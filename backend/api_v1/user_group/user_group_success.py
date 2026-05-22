from backend.api_v1.base.success import DomainSuccess, DeleteSuccess, CreateSuccess, UpdateSuccess


class UserGroupDeleteSuccess(DeleteSuccess):
    message_key = "userGroupDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"User group '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class UserGroupCreateSuccess(CreateSuccess):
    message_key = "userGroupCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"User group '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class UserGroupUpdateSuccess(UpdateSuccess):
    message_key = "userGroupUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"User group '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)