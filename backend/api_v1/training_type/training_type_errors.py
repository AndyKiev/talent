from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    DomainError,
    DeleteError,
)


class TrainingTypeNotFound(NotFoundError):
    message_key = "trainingTypeNotFound"

    def __init__(self, training_type_id: int) -> None:
        self.template_vars = {"trainingTypeId": training_type_id}
        self.fallback = f"Training type with ID {training_type_id} not found"
        super().__init__("TrainingType", "id", training_type_id)


class TrainingTypeNameTaken(AlreadyExistsError):
    message_key = "trainingTypeNameTaken"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Training type with name '{name}' already exists"
        super().__init__("TrainingType", "name", name)


class TrainingTypeKeyTaken(AlreadyExistsError):
    message_key = "trainingTypeKeyTaken"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Training type with key '{key}' already exists"
        super().__init__("TrainingType", "key", key)


class TrainingTypeInvalidTarget(DomainError):
    message_key = "trainingTypeInvalidTarget"

    def __init__(self, link_type_key: str) -> None:
        self.template_vars = {"linkTypeKey": link_type_key}
        self.fallback = (
            f"Training type target does not match link type '{link_type_key}': "
            f"by_job_category requires job_category_id, by_job requires job_id, "
            f"everyone requires neither"
        )
        super().__init__(self.fallback)


class TrainingTypeDeleteError(DeleteError):
    message_key = "trainingTypeDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Training type '{name}' cannot be deleted because it is "
            f"referenced by other records"
        )
        DomainError.__init__(self, self.fallback)
