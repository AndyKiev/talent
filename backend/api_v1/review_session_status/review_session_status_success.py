from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


class ReviewSessionStatusDeleteSuccess(DeleteSuccess):
    message_key = "reviewSessionStatusDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Review session status '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class ReviewSessionStatusCreateSuccess(CreateSuccess):
    message_key = "reviewSessionStatusCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Review session status '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class ReviewSessionStatusUpdateSuccess(UpdateSuccess):
    message_key = "reviewSessionStatusUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Review session status '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
