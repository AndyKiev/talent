from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


class ReviewDimensionDeleteSuccess(DeleteSuccess):
    message_key = "reviewDimensionDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Review dimension '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class ReviewDimensionCreateSuccess(CreateSuccess):
    message_key = "reviewDimensionCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Review dimension '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class ReviewDimensionUpdateSuccess(UpdateSuccess):
    message_key = "reviewDimensionUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Review dimension '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
