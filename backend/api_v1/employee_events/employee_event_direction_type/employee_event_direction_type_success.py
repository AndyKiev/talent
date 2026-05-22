from backend.api_v1.base.success import DomainSuccess, DeleteSuccess, CreateSuccess, UpdateSuccess


class EmployeeEventDirectionTypeDeleteSuccess(DeleteSuccess):
    message_key = "employeeEventDirectionTypeDeleteSuccess"

    def __init__(self, code: str) -> None:
        self.template_vars = {"code": code}
        self.fallback = f"Employee event direction type '{code}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class EmployeeEventDirectionTypeCreateSuccess(CreateSuccess):
    message_key = "employeeEventDirectionTypeCreateSuccess"

    def __init__(self, code: str) -> None:
        self.template_vars = {"code": code}
        self.fallback = f"Employee event direction type '{code}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class EmployeeEventDirectionTypeUpdateSuccess(UpdateSuccess):
    message_key = "employeeEventDirectionTypeUpdateSuccess"

    def __init__(self, code: str) -> None:
        self.template_vars = {"code": code}
        self.fallback = f"Employee event direction type '{code}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
