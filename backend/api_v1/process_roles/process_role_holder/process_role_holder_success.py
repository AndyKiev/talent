from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
)


class ProcessRoleHolderCreateSuccess(CreateSuccess):
    message_key = "processRoleHolderCreateSuccess"

    def __init__(self, employee: str) -> None:
        self.template_vars = {"employee": employee}
        self.fallback = f"Role holder '{employee}' assigned"
        DomainSuccess.__init__(self, self.fallback)


class ProcessRoleHolderDeleteSuccess(DeleteSuccess):
    message_key = "processRoleHolderDeleteSuccess"

    def __init__(self, employee: str) -> None:
        self.template_vars = {"employee": employee}
        self.fallback = f"Role holder '{employee}' removed"
        DomainSuccess.__init__(self, self.fallback)
