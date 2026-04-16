from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    DomainError,
    DeleteError,
    DeleteSuccess,
)


# ---------------------------------------------------------------------------
# Each error carries:
#   - a message_key  → looked up in the DB by BaseService._translate()
#   - template_vars  → injected into the message template (e.g. ${typeId})
#   - fallback       → plain-English string used when DB lookup fails
# ---------------------------------------------------------------------------


class UserGroupTypeNotFound(NotFoundError):
    message_key = "userGroupTypeNotFound"

    def __init__(self, type_id: int) -> None:
        self.template_vars = {"typeId": type_id}
        self.fallback = f"User group type with ID {type_id} not found"
        super().__init__("UserGroupType", "id", type_id)


class UserGroupTypeNotFoundByName(NotFoundError):
    message_key = "userGroupTypeNotFoundByName"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"User group type with name '{name}' not found"
        super().__init__("UserGroupType", "name", name)


class UserGroupTypeNameTaken(AlreadyExistsError):
    message_key = "userGroupTypeNameTaken"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"User group type with name '{name}' already exists"
        super().__init__("UserGroupType", "name", name)



class UserGroupTypeDeleteError(DeleteError):  # was DomainError
    message_key = "userGroupTypeDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"User group type '{name}' cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)  # skip DeleteError.__init__


class UserGroupTypeDeleteSuccess(DeleteSuccess):  # new
    message_key = "userGroupTypeDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"User group type '{name}' successfully deleted"
        DomainError.__init__(self, self.fallback)  # skip DeleteSuccess.__init__
