from backend.api_v1.base.errors import NotFoundError


class EmployeeEventChangeDepartmentNotFound(NotFoundError):
    message_key = "employeeEventChangeDepartmentNotFound"

    def __init__(self, record_id: int) -> None:
        self.template_vars = {"recordId": record_id}
        self.fallback = (
            f"Employee event change department with ID {record_id} not found"
        )
        super().__init__("EmployeeEventChangeDepartment", "id", record_id)
