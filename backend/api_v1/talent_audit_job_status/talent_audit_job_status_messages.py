from backend.api_v1.base.errors import (
    AlreadyExistsError,
    DeleteError,
    DomainError,
    NotFoundError,
)
from backend.api_v1.base.success import (
    CreateSuccess,
    DeleteSuccess,
    DomainSuccess,
    UpdateSuccess,
)


class TalentAuditJobStatusNotFound(NotFoundError):
    message_key = "talentAuditJobStatusNotFound"

    def __init__(self, status_id: int) -> None:
        self.template_vars = {"statusId": status_id}
        self.fallback = f"Talent audit job status with ID {status_id} not found"
        super().__init__("TalentAuditJobStatus", "id", status_id)


class TalentAuditJobStatusNotFoundByName(NotFoundError):
    message_key = "talentAuditJobStatusNotFoundByName"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Talent audit job status with name '{name}' not found"
        super().__init__("TalentAuditJobStatus", "name", name)


class TalentAuditJobStatusNameTaken(AlreadyExistsError):
    message_key = "talentAuditJobStatusNameTaken"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Talent audit job status with name '{name}' already exists"
        super().__init__("TalentAuditJobStatus", "name", name)


class TalentAuditJobStatusDeleteError(DeleteError):
    message_key = "talentAuditJobStatusDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Talent audit job status '{name}' cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)


class TalentAuditJobStatusCreateSuccess(CreateSuccess):
    message_key = "talentAuditJobStatusCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Talent audit job status '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class TalentAuditJobStatusUpdateSuccess(UpdateSuccess):
    message_key = "talentAuditJobStatusUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Talent audit job status '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)


class TalentAuditJobStatusDeleteSuccess(DeleteSuccess):
    message_key = "talentAuditJobStatusDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Talent audit job status '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)
