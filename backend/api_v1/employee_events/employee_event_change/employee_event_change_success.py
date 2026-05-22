from backend.api_v1.base.success import DomainSuccess, DeleteSuccess, CreateSuccess, UpdateSuccess


class EmployeeEventChangeDeleteSuccess(DeleteSuccess):
    message_key = "employeeEventChangeDeleteSuccess"

    def __init__(self, change_id: int) -> None:
        self.template_vars = {"changeId": change_id}
        self.fallback = f"Employee event change with ID {change_id} successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class EmployeeEventChangeCreateSuccess(CreateSuccess):
    message_key = "employeeEventChangeCreateSuccess"

    def __init__(self, change_id: int) -> None:
        self.template_vars = {"changeId": change_id}
        self.fallback = f"Employee event change with ID {change_id} successfully created"
        DomainSuccess.__init__(self, self.fallback)


class EmployeeEventChangeUpdateSuccess(UpdateSuccess):
    message_key = "employeeEventChangeUpdateSuccess"

    def __init__(self, change_id: int) -> None:
        self.template_vars = {"changeId": change_id}
        self.fallback = f"Employee event change with ID {change_id} successfully updated"
        DomainSuccess.__init__(self, self.fallback)
