from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    DomainError,
    DeleteError,
)


class TrainingLinkTypeNotFound(NotFoundError):
    message_key = "trainingLinkTypeNotFound"

    def __init__(self, training_link_type_id: int) -> None:
        self.template_vars = {"trainingLinkTypeId": training_link_type_id}
        self.fallback = f"Training link type with ID {training_link_type_id} not found"
        super().__init__("TrainingLinkType", "id", training_link_type_id)


class TrainingLinkTypeKeyTaken(AlreadyExistsError):
    message_key = "trainingLinkTypeKeyTaken"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Training link type with key '{key}' already exists"
        super().__init__("TrainingLinkType", "key", key)


class TrainingLinkTypeDeleteError(DeleteError):
    message_key = "trainingLinkTypeDeleteError"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = (
            f"Training link type '{key}' cannot be deleted because it is "
            f"referenced by other records"
        )
        DomainError.__init__(self, self.fallback)
