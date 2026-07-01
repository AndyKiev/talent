from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


class TrainingTypeCreateSuccess(CreateSuccess):
    message_key = "trainingTypeCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Training type '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class TrainingTypeUpdateSuccess(UpdateSuccess):
    message_key = "trainingTypeUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Training type '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)


class TrainingTypeDeleteSuccess(DeleteSuccess):
    message_key = "trainingTypeDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Training type '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)
