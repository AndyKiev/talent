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


class ReviewSessionStatusNotFound(NotFoundError):
    message_key = "reviewSessionStatusNotFound"

    def __init__(self, status_id: int) -> None:
        self.template_vars = {"statusId": status_id}
        self.fallback = f"Review session status with ID {status_id} not found"
        super().__init__("ReviewSessionStatus", "id", status_id)


class ReviewSessionStatusNotFoundByKey(NotFoundError):
    message_key = "reviewSessionStatusNotFoundByKey"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Review session status with key '{key}' not found"
        super().__init__("ReviewSessionStatus", "key", key)


class ReviewSessionStatusKeyTaken(AlreadyExistsError):
    message_key = "reviewSessionStatusKeyTaken"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Review session status with key '{key}' already exists"
        super().__init__("ReviewSessionStatus", "key", key)


class ReviewSessionStatusDeleteError(DeleteError):
    message_key = "reviewSessionStatusDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Review session status '{name}' cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)


class ReviewSessionStatusDeleteSuccess(DeleteSuccess):
    message_key = "reviewSessionStatusDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Review session status '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class ReviewSessionStatusCreateSuccess(CreateSuccess):
    message_key = "reviewSessionStatusCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Review session status '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class ReviewSessionStatusUpdateSuccess(UpdateSuccess):
    message_key = "reviewSessionStatusUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Review session status '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
