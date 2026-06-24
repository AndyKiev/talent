from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


class ReviewLevelDeleteSuccess(DeleteSuccess):
    message_key = "reviewLevelDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Review level '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class ReviewLevelCreateSuccess(CreateSuccess):
    message_key = "reviewLevelCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Review level '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class ReviewLevelUpdateSuccess(UpdateSuccess):
    message_key = "reviewLevelUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Review level '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
