from backend.api_v1.base.success import DomainSuccess, DeleteSuccess, CreateSuccess, UpdateSuccess


class JobDeleteSuccess(DeleteSuccess):
    message_key = "jobDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Job '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class JobCreateSuccess(CreateSuccess):
    message_key = "jobCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Job '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class JobUpdateSuccess(UpdateSuccess):
    message_key = "jobUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Job '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
