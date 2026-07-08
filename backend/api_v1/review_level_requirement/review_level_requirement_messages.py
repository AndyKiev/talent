from backend.api_v1.base.errors import NotFoundError, DomainError, DeleteError
from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


class ReviewLevelRequirementNotFound(NotFoundError):
    message_key = "reviewLevelRequirementNotFound"

    def __init__(self, requirement_id: int) -> None:
        self.template_vars = {"typeId": requirement_id}
        self.fallback = f"Review level requirement with ID {requirement_id} not found"
        super().__init__("ReviewLevelRequirement", "id", requirement_id)


class ReviewLevelRequirementDeleteError(DeleteError):
    message_key = "reviewLevelRequirementDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Review level requirement '{name}' cannot be deleted"
        DomainError.__init__(self, self.fallback)


class ReviewLevelRequirementDeleteSuccess(DeleteSuccess):
    message_key = "reviewLevelRequirementDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Review level requirement '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class ReviewLevelRequirementCreateSuccess(CreateSuccess):
    message_key = "reviewLevelRequirementCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Review level requirement '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class ReviewLevelRequirementUpdateSuccess(UpdateSuccess):
    message_key = "reviewLevelRequirementUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Review level requirement '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
