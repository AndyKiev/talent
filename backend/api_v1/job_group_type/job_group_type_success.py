from backend.api_v1.base.success import DomainSuccess, DeleteSuccess, CreateSuccess, UpdateSuccess


class JobGroupTypeDeleteSuccess(DeleteSuccess):
    message_key = "jobGroupTypeDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Job group type '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class JobGroupTypeCreateSuccess(CreateSuccess):
    message_key = "jobGroupTypeCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Job group type '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class JobGroupTypeUpdateSuccess(UpdateSuccess):
    message_key = "jobGroupTypeUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Job group type '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
