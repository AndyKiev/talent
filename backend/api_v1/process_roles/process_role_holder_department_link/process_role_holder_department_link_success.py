from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
)


class ProcessRoleHolderDepartmentCreateSuccess(CreateSuccess):
    message_key = "processRoleHolderDepartmentCreateSuccess"

    def __init__(self, department: str) -> None:
        self.template_vars = {"department": department}
        self.fallback = f"Department '{department}' added"
        DomainSuccess.__init__(self, self.fallback)


class ProcessRoleHolderDepartmentDeleteSuccess(DeleteSuccess):
    message_key = "processRoleHolderDepartmentDeleteSuccess"

    def __init__(self, department: str) -> None:
        self.template_vars = {"department": department}
        self.fallback = f"Department '{department}' removed"
        DomainSuccess.__init__(self, self.fallback)
