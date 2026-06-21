from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    DomainError,
    DeleteError,
)


class ReviewDimensionNotFound(NotFoundError):
    message_key = "reviewDimensionNotFound"

    def __init__(self, dim_id: int) -> None:
        self.template_vars = {"typeId": dim_id}
        self.fallback = f"Review dimension with ID {dim_id} not found"
        super().__init__("ReviewDimension", "id", dim_id)


class ReviewDimensionNotFoundByName(NotFoundError):
    message_key = "reviewDimensionNotFoundByName"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Review dimension with name '{name}' not found"
        super().__init__("ReviewDimension", "name", name)


class ReviewDimensionNameTaken(AlreadyExistsError):
    message_key = "reviewDimensionNameTaken"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Review dimension with name '{name}' already exists"
        super().__init__("ReviewDimension", "name", name)


class ReviewDimensionInvalidColor(DomainError):
    message_key = "reviewDimensionInvalidColor"

    def __init__(self, color: str) -> None:
        self.template_vars = {"color": color}
        self.fallback = (
            f"Invalid color '{color}'. Use a hex value like #2E7D32."
        )
        super().__init__(self.fallback)


class ReviewDimensionDeleteError(DeleteError):
    message_key = "reviewDimensionDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Review dimension '{name}' cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)
