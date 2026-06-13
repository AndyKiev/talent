from backend.api_v1.base.success import DomainSuccess, UpdateSuccess


class EmployeePhotoSaveSuccess(UpdateSuccess):
    message_key = "employeePhotoSaveSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Photo saved successfully"
        DomainSuccess.__init__(self, self.fallback)


class EmployeePhotoDeleteSuccess(UpdateSuccess):
    message_key = "employeePhotoDeleteSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Photo removed successfully"
        DomainSuccess.__init__(self, self.fallback)
