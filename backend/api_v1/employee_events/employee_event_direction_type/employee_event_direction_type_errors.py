from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    DomainError,
    DeleteError,
)


class EmployeeEventDirectionTypeNotFound(NotFoundError):
    message_key = "employeeEventDirectionTypeNotFound"

    def __init__(self, type_id: int) -> None:
        self.template_vars = {"typeId": type_id}
        self.fallback = f"Employee event direction type with ID {type_id} not found"
        super().__init__("EmployeeEventDirectionType", "id", type_id)


class EmployeeEventDirectionTypeNotFoundByCode(NotFoundError):
    message_key = "employeeEventDirectionTypeNotFoundByCode"

    def __init__(self, code: str) -> None:
        self.template_vars = {"code": code}
        self.fallback = f"Employee event direction type with code '{code}' not found"
        super().__init__("EmployeeEventDirectionType", "code", code)


class EmployeeEventDirectionTypeCodeTaken(AlreadyExistsError):
    message_key = "employeeEventDirectionTypeCodeTaken"

    def __init__(self, code: str) -> None:
        self.template_vars = {"code": code}
        self.fallback = f"Employee event direction type with code '{code}' already exists"
        super().__init__("EmployeeEventDirectionType", "code", code)


class EmployeeEventDirectionTypeDeleteError(DeleteError):
    message_key = "employeeEventDirectionTypeDeleteError"

    def __init__(self, code: str) -> None:
        self.template_vars = {"code": code}
        self.fallback = (
            f"Employee event direction type '{code}' cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)
