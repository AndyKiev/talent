from backend.api_v1.base.errors import (
    NotFoundError,
    DomainError,
    DeleteError,
)
from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


class JobRequirementGroupNotFound(NotFoundError):
    message_key = "jobRequirementGroupNotFound"

    def __init__(self, group_id: int) -> None:
        self.template_vars = {"id": group_id}
        self.fallback = f"Requirement group with ID {group_id} not found"
        super().__init__("JobRequirementGroup", "id", group_id)


class JobRequirementGroupWrongJob(DomainError):
    message_key = "jobRequirementGroupWrongJob"

    def __init__(self, group_id: int) -> None:
        self.template_vars = {"id": group_id}
        self.fallback = f"Requirement group {group_id} belongs to another job"
        super().__init__(self.fallback)


class JobRequirementGroupDeleteError(DeleteError):
    message_key = "jobRequirementGroupDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Requirement group '{name}' cannot be deleted "
            f"because it is used by recruitment tasks"
        )
        DomainError.__init__(self, self.fallback)


class JobRequirementGroupDeleteSuccess(DeleteSuccess):
    message_key = "jobRequirementGroupDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Requirement group '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class JobRequirementGroupCreateSuccess(CreateSuccess):
    message_key = "jobRequirementGroupCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Requirement group '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class JobRequirementGroupUpdateSuccess(UpdateSuccess):
    message_key = "jobRequirementGroupUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Requirement group '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
