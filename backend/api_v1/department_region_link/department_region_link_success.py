from backend.api_v1.base.success import DomainSuccess, DeleteSuccess, CreateSuccess, UpdateSuccess


class DepartmentRegionLinkDeleteSuccess(DeleteSuccess):
    message_key = "departmentRegionLinkDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Department–region link '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class DepartmentRegionLinkCreateSuccess(CreateSuccess):
    message_key = "departmentRegionLinkCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Department–region link '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class DepartmentRegionLinkUpdateSuccess(UpdateSuccess):
    message_key = "departmentRegionLinkUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Department–region link '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
