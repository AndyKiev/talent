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


class PlanSessionStatusNotFound(NotFoundError):
    message_key = "planSessionStatusNotFound"

    def __init__(self, status_id: int) -> None:
        self.template_vars = {"statusId": status_id}
        self.fallback = f"Plan session status with ID {status_id} not found"
        super().__init__("PlanSessionStatus", "id", status_id)


class PlanSessionStatusNotFoundByKey(NotFoundError):
    message_key = "planSessionStatusNotFoundByKey"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Plan session status with key '{key}' not found"
        super().__init__("PlanSessionStatus", "key", key)


class PlanSessionStatusKeyTaken(AlreadyExistsError):
    message_key = "planSessionStatusKeyTaken"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Plan session status with key '{key}' already exists"
        super().__init__("PlanSessionStatus", "key", key)


class PlanSessionStatusDeleteError(DeleteError):
    message_key = "planSessionStatusDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Plan session status '{name}' cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)


class PlanSessionStatusDeleteSuccess(DeleteSuccess):
    message_key = "planSessionStatusDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Plan session status '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class PlanSessionStatusCreateSuccess(CreateSuccess):
    message_key = "planSessionStatusCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Plan session status '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class PlanSessionStatusUpdateSuccess(UpdateSuccess):
    message_key = "planSessionStatusUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Plan session status '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
