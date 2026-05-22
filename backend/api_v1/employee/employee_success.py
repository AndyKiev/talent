from backend.api_v1.base.success import DomainSuccess, DeleteSuccess


class EmployeeDeleteSuccess(DeleteSuccess):  # new
    message_key = "employeeDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Employee '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)
