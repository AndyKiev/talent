from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


class DepartmentTypeDeleteSuccess(DeleteSuccess):
    message_key = "departmentTypeDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Department type '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class DepartmentTypeCreateSuccess(CreateSuccess):
    message_key = "departmentTypeCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Department type '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class DepartmentTypeUpdateSuccess(UpdateSuccess):
    message_key = "departmentTypeUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Department type '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
