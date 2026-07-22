from backend.api_v1.base.errors import DomainError, NotFoundError
from backend.api_v1.base.success import (
    CreateSuccess,
    DeleteSuccess,
    DomainSuccess,
    UpdateSuccess,
)


class RecommendedTrainingNotFound(NotFoundError):
    message_key = "recommendedTrainingNotFound"

    def __init__(self, training_id: int) -> None:
        self.template_vars = {"trainingId": training_id}
        self.fallback = f"Recommended training with ID {training_id} not found"
        super().__init__("EmployeeRecommendedTraining", "id", training_id)


class RecommendedTrainingStatusNotFound(NotFoundError):
    message_key = "recommendedTrainingStatusNotFound"

    def __init__(self, status_id: int) -> None:
        self.template_vars = {"statusId": status_id}
        self.fallback = f"Recommended training status with ID {status_id} not found"
        super().__init__("EmployeeRecommendedTrainingStatus", "id", status_id)


class RecommendedTrainingStatusKeyNotFound(NotFoundError):
    """Raised when the seeded default status is missing — the list cannot take a
    new row without it, so it is a setup error, not a user error."""

    message_key = "recommendedTrainingStatusKeyNotFound"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = (
            f"Recommended training status '{key}' is missing — run the seed that "
            f"creates the recommended-training statuses"
        )
        super().__init__("EmployeeRecommendedTrainingStatus", "key", key)


class RecommendedTrainingTextRequired(DomainError):
    message_key = "recommendedTrainingTextRequired"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "A recommended training needs a description"
        super().__init__(self.fallback)


class RecommendedTrainingCreateSuccess(CreateSuccess):
    message_key = "recommendedTrainingCreateSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Recommended training added"
        DomainSuccess.__init__(self, self.fallback)


class RecommendedTrainingUpdateSuccess(UpdateSuccess):
    message_key = "recommendedTrainingUpdateSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Recommended training updated"
        DomainSuccess.__init__(self, self.fallback)


class RecommendedTrainingDeleteSuccess(DeleteSuccess):
    message_key = "recommendedTrainingDeleteSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Recommended training deleted"
        DomainSuccess.__init__(self, self.fallback)
