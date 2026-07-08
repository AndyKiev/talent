from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


class PersonDeleteSuccess(DeleteSuccess):
    message_key = "personDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Person '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class PersonCreateSuccess(CreateSuccess):
    message_key = "personCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Person '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class PersonUpdateSuccess(UpdateSuccess):
    message_key = "personUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Person '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
