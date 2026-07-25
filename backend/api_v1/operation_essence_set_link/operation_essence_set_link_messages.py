from backend.api_v1.base.errors import (
    AlreadyExistsError,
    DeleteError,
    DomainError,
    NotFoundError,
    RelationshipError,
)
from backend.api_v1.base.success import CreateSuccess, DeleteSuccess, DomainSuccess


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


class OperationEssenceSetLinkCreateSuccess(CreateSuccess):
    message_key = "operationEssenceSetLinkCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Permission '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class OperationEssenceSetLinkDeleteSuccess(DeleteSuccess):
    message_key = "operationEssenceSetLinkDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Permission '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class GroupPermissionGrantSuccess(DomainSuccess):
    message_key = "groupPermissionGrantSuccess"

    def __init__(self, group_name: str, permission_name: str) -> None:
        self.template_vars = {"group": group_name, "permission": permission_name}
        self.fallback = (
            f"Permission '{permission_name}' granted to group '{group_name}'"
        )
        DomainSuccess.__init__(self, self.fallback)


class GroupPermissionRevokeSuccess(DomainSuccess):
    message_key = "groupPermissionRevokeSuccess"

    def __init__(self, group_name: str, permission_name: str) -> None:
        self.template_vars = {"group": group_name, "permission": permission_name}
        self.fallback = (
            f"Permission '{permission_name}' revoked from group '{group_name}'"
        )
        DomainSuccess.__init__(self, self.fallback)
