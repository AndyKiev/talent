from backend.api_v1.base.success import DomainSuccess, DeleteSuccess, CreateSuccess, UpdateSuccess

class DepartmentTypeParentalLinkDeleteSuccess(DeleteSuccess):
    message_key = "departmentTypeParentalLinkDeleteSuccess"
    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Department type parental link '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)

class DepartmentTypeParentalLinkCreateSuccess(CreateSuccess):
    message_key = "departmentTypeParentalLinkCreateSuccess"
    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Department type parental link '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)

class DepartmentTypeParentalLinkUpdateSuccess(UpdateSuccess):
    message_key = "departmentTypeParentalLinkUpdateSuccess"
    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Department type parental link '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)