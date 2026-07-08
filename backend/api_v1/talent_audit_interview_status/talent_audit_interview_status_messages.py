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


class TalentAuditInterviewStatusNotFound(NotFoundError):
    message_key = "talentAuditInterviewStatusNotFound"

    def __init__(self, status_id: int) -> None:
        self.template_vars = {"statusId": status_id}
        self.fallback = f"Talent audit interview status with ID {status_id} not found"
        super().__init__("TalentAuditInterviewStatus", "id", status_id)


class TalentAuditInterviewStatusNotFoundByName(NotFoundError):
    message_key = "talentAuditInterviewStatusNotFoundByName"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Talent audit interview status with name '{name}' not found"
        super().__init__("TalentAuditInterviewStatus", "name", name)


class TalentAuditInterviewStatusNameTaken(AlreadyExistsError):
    message_key = "talentAuditInterviewStatusNameTaken"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Talent audit interview status with name '{name}' already exists"
        )
        super().__init__("TalentAuditInterviewStatus", "name", name)


class TalentAuditInterviewStatusDeleteError(DeleteError):
    message_key = "talentAuditInterviewStatusDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Talent audit interview status '{name}' cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)


class TalentAuditInterviewStatusCreateSuccess(CreateSuccess):
    message_key = "talentAuditInterviewStatusCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Talent audit interview status '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class TalentAuditInterviewStatusUpdateSuccess(UpdateSuccess):
    message_key = "talentAuditInterviewStatusUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Talent audit interview status '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)


class TalentAuditInterviewStatusDeleteSuccess(DeleteSuccess):
    message_key = "talentAuditInterviewStatusDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Talent audit interview status '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)
