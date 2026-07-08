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


class TrainingCategoryNotFound(NotFoundError):
    message_key = "trainingCategoryNotFound"

    def __init__(self, training_category_id: int) -> None:
        self.template_vars = {"trainingCategoryId": training_category_id}
        self.fallback = f"Training category with ID {training_category_id} not found"
        super().__init__("TrainingCategory", "id", training_category_id)


class TrainingCategoryNameTaken(AlreadyExistsError):
    message_key = "trainingCategoryNameTaken"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Training category with name '{name}' already exists"
        super().__init__("TrainingCategory", "name", name)


class TrainingCategoryKeyTaken(AlreadyExistsError):
    message_key = "trainingCategoryKeyTaken"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Training category with key '{key}' already exists"
        super().__init__("TrainingCategory", "key", key)


class TrainingCategoryDeleteError(DeleteError):
    message_key = "trainingCategoryDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Training category '{name}' cannot be deleted because it is "
            f"referenced by other records"
        )
        DomainError.__init__(self, self.fallback)


class TrainingCategoryCreateSuccess(CreateSuccess):
    message_key = "trainingCategoryCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Training category '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class TrainingCategoryUpdateSuccess(UpdateSuccess):
    message_key = "trainingCategoryUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Training category '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)


class TrainingCategoryDeleteSuccess(DeleteSuccess):
    message_key = "trainingCategoryDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Training category '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)
