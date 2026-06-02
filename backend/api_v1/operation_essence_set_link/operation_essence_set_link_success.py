# backend/api_v1/operation_essence_set_link/operation_essence_set_link_success.py
#
# Success messages live here on the permission grain — this is the thing the
# user actually acts on and gets feedback for. The EssenceSet underneath is an
# internal artifact and has no user-facing success of its own.
#
from backend.api_v1.base.success import DomainSuccess, DeleteSuccess, CreateSuccess


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
