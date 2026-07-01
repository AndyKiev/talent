from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


class TrainingLinkTypeCreateSuccess(CreateSuccess):
    message_key = "trainingLinkTypeCreateSuccess"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Training link type '{key}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class TrainingLinkTypeUpdateSuccess(UpdateSuccess):
    message_key = "trainingLinkTypeUpdateSuccess"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Training link type '{key}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)


class TrainingLinkTypeDeleteSuccess(DeleteSuccess):
    message_key = "trainingLinkTypeDeleteSuccess"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Training link type '{key}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)
