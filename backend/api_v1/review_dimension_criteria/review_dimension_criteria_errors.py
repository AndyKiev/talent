from backend.api_v1.base.errors import NotFoundError, DomainError, DeleteError


class ReviewDimensionCriteriaNotFound(NotFoundError):
    message_key = "reviewDimensionCriteriaNotFound"

    def __init__(self, criteria_id: int) -> None:
        self.template_vars = {"typeId": criteria_id}
        self.fallback = f"Review dimension criteria with ID {criteria_id} not found"
        super().__init__("ReviewDimensionCriteria", "id", criteria_id)


class ReviewDimensionCriteriaDeleteError(DeleteError):
    message_key = "reviewDimensionCriteriaDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Review dimension criteria '{name}' cannot be deleted"
        DomainError.__init__(self, self.fallback)
