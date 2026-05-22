from backend.api_v1.base.success import DomainSuccess, DeleteSuccess, CreateSuccess, UpdateSuccess


class DepartmentTypeJobLinkDeleteSuccess(DeleteSuccess):
    message_key = "departmentTypeJobLinkDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Department type–job link '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class DepartmentTypeJobLinkCreateSuccess(CreateSuccess):
    message_key = "departmentTypeJobLinkCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Department type–job link '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class DepartmentTypeJobLinkUpdateSuccess(UpdateSuccess):
    message_key = "departmentTypeJobLinkUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Department type–job link '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
