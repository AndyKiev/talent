from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    DomainError,
    DeleteError,
)


class TalentAuditStatusNotFound(NotFoundError):
    message_key = "talentAuditStatusNotFound"

    def __init__(self, status_id: int) -> None:
        self.template_vars = {"statusId": status_id}
        self.fallback = f"Talent audit status with ID {status_id} not found"
        super().__init__("TalentAuditStatus", "id", status_id)


class TalentAuditStatusNotFoundByName(NotFoundError):
    message_key = "talentAuditStatusNotFoundByName"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Talent audit status with name '{name}' not found"
        super().__init__("TalentAuditStatus", "name", name)


class TalentAuditStatusNameTaken(AlreadyExistsError):
    message_key = "talentAuditStatusNameTaken"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Talent audit status with name '{name}' already exists"
        super().__init__("TalentAuditStatus", "name", name)


class TalentAuditStatusDeleteError(DeleteError):
    message_key = "talentAuditStatusDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Talent audit status '{name}' cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)
