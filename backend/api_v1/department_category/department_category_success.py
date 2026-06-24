from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


class DepartmentCategoryDeleteSuccess(DeleteSuccess):
    message_key = "departmentCategoryDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Department category '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class DepartmentCategoryCreateSuccess(CreateSuccess):
    message_key = "departmentCategoryCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Department category '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class DepartmentCategoryUpdateSuccess(UpdateSuccess):
    message_key = "departmentCategoryUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Department category '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
