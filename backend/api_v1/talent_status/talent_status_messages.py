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


class TalentStatusNotFound(NotFoundError):
    message_key = "talentStatusNotFound"

    def __init__(self, status_id: int) -> None:
        self.template_vars = {"statusId": status_id}
        self.fallback = f"Talent status with ID {status_id} not found"
        super().__init__("TalentStatus", "id", status_id)


class TalentStatusNotFoundByName(NotFoundError):
    message_key = "talentStatusNotFoundByName"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Talent status with name '{name}' not found"
        super().__init__("TalentStatus", "name", name)


class TalentStatusKeyTaken(AlreadyExistsError):
    message_key = "talentStatusKeyTaken"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Talent status with key '{key}' already exists"
        super().__init__("TalentStatus", "key", key)


class TalentStatusNameTaken(AlreadyExistsError):
    message_key = "talentStatusNameTaken"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Talent status with name '{name}' already exists"
        super().__init__("TalentStatus", "name", name)


class TalentStatusDeleteError(DeleteError):
    message_key = "talentStatusDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Talent status '{name}' cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)


class TalentStatusDeleteSuccess(DeleteSuccess):
    message_key = "talentStatusDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Talent status '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class TalentStatusCreateSuccess(CreateSuccess):
    message_key = "talentStatusCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Talent status '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class TalentStatusUpdateSuccess(UpdateSuccess):
    message_key = "talentStatusUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Talent status '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
