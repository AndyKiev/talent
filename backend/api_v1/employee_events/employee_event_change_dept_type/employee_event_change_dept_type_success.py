from backend.api_v1.base.success import DomainSuccess, DeleteSuccess, CreateSuccess, UpdateSuccess


class EmployeeEventChangeDeptTypeDeleteSuccess(DeleteSuccess):
    message_key = "employeeEventChangeDeptTypeDeleteSuccess"

    def __init__(self, code: str) -> None:
        self.template_vars = {"code": code}
        self.fallback = f"Employee event change dept type '{code}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class EmployeeEventChangeDeptTypeCreateSuccess(CreateSuccess):
    message_key = "employeeEventChangeDeptTypeCreateSuccess"

    def __init__(self, code: str) -> None:
        self.template_vars = {"code": code}
        self.fallback = f"Employee event change dept type '{code}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class EmployeeEventChangeDeptTypeUpdateSuccess(UpdateSuccess):
    message_key = "employeeEventChangeDeptTypeUpdateSuccess"

    def __init__(self, code: str) -> None:
        self.template_vars = {"code": code}
        self.fallback = f"Employee event change dept type '{code}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
