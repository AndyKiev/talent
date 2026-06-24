from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


class DepartmentDeleteSuccess(DeleteSuccess):
    message_key = "departmentDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Department '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class DepartmentCreateSuccess(CreateSuccess):
    message_key = "departmentCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Department '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class DepartmentUpdateSuccess(UpdateSuccess):
    message_key = "departmentUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Department '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
