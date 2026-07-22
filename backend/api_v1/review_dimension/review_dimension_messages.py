from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    DomainError,
    DeleteError,
)
from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
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
        self.fallback = f"Invalid color '{color}'. Use a hex value like #2E7D32."
        super().__init__(self.fallback)


class ReviewDimensionDeleteError(DeleteError):
    """Raised when the FK refuses the delete because the competence is still in
    use — a review summary (`review_session_employee_dimensions`) or a development
    mission points at it.

    The message names DEACTIVATION on purpose. Those references are content: a
    summary records what a reviewer said about a person, so erasing it to tidy
    the competence catalogue would destroy history. Deactivating stops the
    competence being offered while every existing review keeps it."""

    message_key = "reviewDimensionDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Competence '{name}' cannot be deleted because it is used in review "
            f"summaries or development plans. Deactivate it instead — it will "
            f"stop being offered while existing reviews keep it."
        )
        DomainError.__init__(self, self.fallback)


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
