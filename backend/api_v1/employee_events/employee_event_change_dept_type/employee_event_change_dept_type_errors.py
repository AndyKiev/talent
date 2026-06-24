from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    DomainError,
    DeleteError,
)


class EmployeeEventChangeDeptTypeNotFound(NotFoundError):
    message_key = "employeeEventChangeDeptTypeNotFound"

    def __init__(self, type_id: int) -> None:
        self.template_vars = {"typeId": type_id}
        self.fallback = f"Employee event change dept type with ID {type_id} not found"
        super().__init__("EmployeeEventChangeDeptType", "id", type_id)


class EmployeeEventChangeDeptTypeNotFoundByCode(NotFoundError):
    message_key = "employeeEventChangeDeptTypeNotFoundByCode"

    def __init__(self, code: str) -> None:
        self.template_vars = {"code": code}
        self.fallback = f"Employee event change dept type with code '{code}' not found"
        super().__init__("EmployeeEventChangeDeptType", "code", code)


class EmployeeEventChangeDeptTypeCodeTaken(AlreadyExistsError):
    message_key = "employeeEventChangeDeptTypeCodeTaken"

    def __init__(self, code: str) -> None:
        self.template_vars = {"code": code}
        self.fallback = (
            f"Employee event change dept type with code '{code}' already exists"
        )
        super().__init__("EmployeeEventChangeDeptType", "code", code)


class EmployeeEventChangeDeptTypeDeleteError(DeleteError):
    message_key = "employeeEventChangeDeptTypeDeleteError"

    def __init__(self, code: str) -> None:
        self.template_vars = {"code": code}
        self.fallback = (
            f"Employee event change dept type '{code}' cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)
