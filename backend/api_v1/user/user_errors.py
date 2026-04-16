from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    RelationshipError,
    DomainError,
)

# Shared group errors — message keys (groupNotFound, groupsNotFound) already in the DB.


# ---------------------------------------------------------------------------
# Each error carries:
#   - a message_key  → looked up in the DB by BaseService._translate()
#   - template_vars  → injected into the message template (e.g. ${userId})
#   - fallback       → plain-English string used when DB lookup fails
# ---------------------------------------------------------------------------


class UserNotFound(NotFoundError):
    message_key = "userNotFound"

    def __init__(self, user_id: int) -> None:
        self.template_vars = {"userId": user_id}
        self.fallback = f"User with ID {user_id} not found"
        super().__init__("User", "id", user_id)


class UserNotFoundByCode(NotFoundError):
    message_key = "userNotFoundByCode"

    def __init__(self, code: str) -> None:
        self.template_vars = {"code": code}
        self.fallback = f"User with code '{code}' not found"
        super().__init__("User", "code", code)


class UserCodeTaken(AlreadyExistsError):
    message_key = "userCodeTaken"

    def __init__(self, code: str) -> None:
        self.template_vars = {"code": code}
        self.fallback = f"User with code '{code}' already exists"
        super().__init__("User", "code", code)


class UserEmailTaken(AlreadyExistsError):
    message_key = "userEmailTaken"

    def __init__(self, email: str) -> None:
        self.template_vars = {"email": email}
        self.fallback = f"User with email '{email}' already exists"
        super().__init__("User", "email", email)


class UserAlreadyInGroup(RelationshipError):
    message_key = "userAlreadyInGroup"

    def __init__(self, user_code: str, group_name: str) -> None:
        self.template_vars = {"userCode": user_code, "groupName": group_name}
        self.fallback = f"User '{user_code}' is already in group '{group_name}'"
        super().__init__(self.fallback)


class UserNotInGroup(RelationshipError):
    message_key = "userNotInGroup"

    def __init__(self, user_code: str, group_name: str) -> None:
        self.template_vars = {"userCode": user_code, "groupName": group_name}
        self.fallback = f"User '{user_code}' is not in group '{group_name}'"
        super().__init__(self.fallback)


class UserDeleteError(DomainError):
    message_key = "userDeleteError"

    def __init__(self, user_code: str) -> None:
        self.template_vars = {"code": user_code}
        self.fallback = f"User '{user_code}' cannot be deleted because it is referenced by other records"
        super().__init__(self.fallback)
