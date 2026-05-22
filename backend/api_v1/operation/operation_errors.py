from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    RelationshipError,
    DomainError,
    DeleteError,
)


# ---------------------------------------------------------------------------
# Each error carries:
#   - a message_key  → looked up in the DB by BaseService._translate()
#   - template_vars  → injected into the message template (e.g. ${name})
#   - fallback       → plain-English string used when DB lookup fails
# ---------------------------------------------------------------------------


class OperationNotFound(NotFoundError):
    message_key = "operationNotFound"

    def __init__(self, operation_id: int) -> None:
        self.template_vars = {"operationId": operation_id}
        self.fallback = f"Operation with ID {operation_id} not found"
        super().__init__("Operation", "id", operation_id)


class OperationNotFoundByName(NotFoundError):
    message_key = "operationNotFoundByName"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Operation with name '{name}' not found"
        super().__init__("Operation", "name", name)


class OperationNameTaken(AlreadyExistsError):
    message_key = "operationNameTaken"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Operation with name '{name}' already exists"
        super().__init__("Operation", "name", name)


class OperationHasGroups(RelationshipError):
    message_key = "operationHasGroups"

    def __init__(self, operation_name: str, group_names: list[str]) -> None:
        groups_str = ", ".join(group_names)
        self.template_vars = {"name": operation_name, "groups": groups_str}
        self.fallback = (
            f"Operation '{operation_name}' cannot be deleted because it is linked to "
            f"the following user groups: {groups_str}. "
            f"Please unlink the user groups first before deleting the operation."
        )
        super().__init__(self.fallback)


class OperationAlreadyInGroup(RelationshipError):
    message_key = "operationAlreadyInGroup"

    def __init__(self, operation_name: str, group_name: str) -> None:
        self.template_vars = {"operationName": operation_name, "groupName": group_name}
        self.fallback = (
            f"Operation '{operation_name}' is already linked to group '{group_name}'"
        )
        super().__init__(self.fallback)


class OperationNotInGroup(RelationshipError):
    message_key = "operationNotInGroup"

    def __init__(self, operation_name: str, group_name: str) -> None:
        self.template_vars = {"operationName": operation_name, "groupName": group_name}
        self.fallback = (
            f"Operation '{operation_name}' is not linked to group '{group_name}'"
        )
        super().__init__(self.fallback)


class OperationGroupNotFound(NotFoundError):
    message_key = "operationGroupNotFound"

    def __init__(self, group_id: int) -> None:
        self.template_vars = {"groupId": group_id}
        self.fallback = f"User group with ID {group_id} not found"
        super().__init__("UserGroup", "id", group_id)


class OperationGroupsNotFound(NotFoundError):
    message_key = "operationGroupsNotFound"

    def __init__(self, missing_ids: set) -> None:
        ids_str = ", ".join(str(i) for i in sorted(missing_ids))
        self.template_vars = {"ids": ids_str}
        self.fallback = f"User groups with IDs {{{ids_str}}} not found"
        super().__init__("UserGroup", "ids", ids_str)


class OperationDeleteError(DeleteError):
    message_key = "operationDeleteError"

    def __init__(self, operation_name: str) -> None:
        self.template_vars = {"name": operation_name}
        self.fallback = (
            f"Operation '{operation_name}' cannot be deleted because it is "
            f"referenced by other records"
        )
        DomainError.__init__(self, self.fallback)


