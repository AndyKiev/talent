from backend.api_v1.base.errors import (
    AlreadyExistsError,
    DeleteError,
    DomainError,
    NotFoundError,
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
