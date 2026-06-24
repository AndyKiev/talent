# backend/api_v1/operation_essence_set_link/operation_essence_set_link_errors.py
from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    RelationshipError,
    DomainError,
    DeleteError,
)


class OperationEssenceSetLinkNotFound(NotFoundError):
    message_key = "operationEssenceSetLinkNotFound"

    def __init__(self, link_id: int) -> None:
        self.template_vars = {"linkId": link_id}
        self.fallback = f"Permission link with ID {link_id} not found"
        super().__init__("OperationEssenceSetLink", "id", link_id)


class OperationEssenceSetLinkDuplicate(AlreadyExistsError):
    message_key = "operationEssenceSetLinkDuplicate"

    def __init__(self, operation_name: str, fingerprint: str) -> None:
        self.template_vars = {"operation": operation_name, "fingerprint": fingerprint}
        self.fallback = (
            f"Operation '{operation_name}' is already linked to essence set "
            f"'{fingerprint}'"
        )
        super().__init__(
            "OperationEssenceSetLink", "operation_essence_set", fingerprint
        )


class OperationEssenceSetLinkHasGroups(RelationshipError):
    message_key = "operationEssenceSetLinkHasGroups"

    def __init__(
        self, operation_name: str, fingerprint: str, group_names: list[str]
    ) -> None:
        groups_str = ", ".join(group_names)
        self.template_vars = {
            "operation": operation_name,
            "fingerprint": fingerprint,
            "groups": groups_str,
        }
        self.fallback = (
            f"Permission '{operation_name} · {fingerprint}' cannot be deleted "
            f"because it is granted to user groups: {groups_str}. "
            f"Revoke it from those groups first."
        )
        super().__init__(self.fallback)


class OperationEssenceSetLinkDeleteError(DeleteError):
    message_key = "operationEssenceSetLinkDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Permission '{name}' cannot be deleted because it is referenced "
            f"by other records"
        )
        DomainError.__init__(self, self.fallback)
