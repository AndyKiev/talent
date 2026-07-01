from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


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
