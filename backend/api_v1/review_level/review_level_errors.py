from backend.api_v1.base.errors import NotFoundError, DomainError, DeleteError


class ReviewLevelNotFound(NotFoundError):
    message_key = "reviewLevelNotFound"

    def __init__(self, level_id: int) -> None:
        self.template_vars = {"typeId": level_id}
        self.fallback = f"Review level with ID {level_id} not found"
        super().__init__("ReviewLevel", "id", level_id)


class ReviewLevelDeleteError(DeleteError):
    message_key = "reviewLevelDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Review level '{name}' cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)
