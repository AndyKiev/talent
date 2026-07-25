from backend.api_v1.base.errors import DomainError, NotFoundError
from backend.api_v1.base.success import DomainSuccess, UpdateSuccess


class EmployeePhotoNotFound(NotFoundError):
    message_key = "employeePhotoNotFound"

    def __init__(self, employee_id: int) -> None:
        self.template_vars = {"typeId": employee_id}
        self.fallback = f"No photo stored for employee {employee_id}"
        super().__init__("EmployeePhoto", "employee_id", employee_id)


class EmployeePhotoInvalidType(DomainError):
    """Upload rejected — not a real JPG/PNG image."""

    message_key = "employeePhotoInvalidType"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Only JPG or PNG images are allowed"
        super().__init__(self.fallback)


class EmployeePhotoTooLarge(DomainError):
    """Upload rejected — raw bytes exceed the hard cap (before decoding)."""

    message_key = "employeePhotoTooLarge"

    def __init__(self, max_mb: int) -> None:
        self.template_vars = {"max": f"{max_mb}MB"}
        self.fallback = f"Image is too large (max {max_mb}MB)"
        super().__init__(self.fallback)


class EmployeePhotosDisabled(DomainError):
    """Upload rejected — the photos feature is OFF in developer settings."""

    message_key = "employeePhotosDisabled"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Employee photos are disabled"
        super().__init__(self.fallback)


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
