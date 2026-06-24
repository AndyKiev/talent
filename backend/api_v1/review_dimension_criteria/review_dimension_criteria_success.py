from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


class ReviewDimensionCriteriaDeleteSuccess(DeleteSuccess):
    message_key = "reviewDimensionCriteriaDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Review dimension criteria '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class ReviewDimensionCriteriaCreateSuccess(CreateSuccess):
    message_key = "reviewDimensionCriteriaCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Review dimension criteria '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class ReviewDimensionCriteriaUpdateSuccess(UpdateSuccess):
    message_key = "reviewDimensionCriteriaUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Review dimension criteria '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
