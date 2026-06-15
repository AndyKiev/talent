from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
)


class ProcessRoleHolderEmployeeCreateSuccess(CreateSuccess):
    message_key = "processRoleHolderEmployeeCreateSuccess"

    def __init__(self, employee: str) -> None:
        self.template_vars = {"employee": employee}
        self.fallback = f"Employee '{employee}' added"
        DomainSuccess.__init__(self, self.fallback)


class ProcessRoleHolderEmployeeDeleteSuccess(DeleteSuccess):
    message_key = "processRoleHolderEmployeeDeleteSuccess"

    def __init__(self, employee: str) -> None:
        self.template_vars = {"employee": employee}
        self.fallback = f"Employee '{employee}' removed"
        DomainSuccess.__init__(self, self.fallback)
