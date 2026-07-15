from backend.api_v1.base.errors import NotFoundError, DomainError, DeleteError
from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


class JobRequirementItemNotFound(NotFoundError):
    message_key = "jobRequirementItemNotFound"

    def __init__(self, item_id: int) -> None:
        self.template_vars = {"id": item_id}
        self.fallback = f"Requirement point with ID {item_id} not found"
        super().__init__("JobRequirementItem", "id", item_id)


class JobRequirementItemDeleteError(DeleteError):
    message_key = "jobRequirementItemDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Requirement point '{name}' cannot be deleted"
        DomainError.__init__(self, self.fallback)


class JobRequirementItemDeleteSuccess(DeleteSuccess):
    message_key = "jobRequirementItemDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = "Requirement point successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class JobRequirementItemCreateSuccess(CreateSuccess):
    message_key = "jobRequirementItemCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = "Requirement point successfully created"
        DomainSuccess.__init__(self, self.fallback)


class JobRequirementItemUpdateSuccess(UpdateSuccess):
    message_key = "jobRequirementItemUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = "Requirement point successfully updated"
        DomainSuccess.__init__(self, self.fallback)
