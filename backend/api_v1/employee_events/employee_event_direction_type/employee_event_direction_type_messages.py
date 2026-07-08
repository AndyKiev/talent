from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    DomainError,
    DeleteError,
)
from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
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
        self.fallback = (
            f"Employee event direction type with code '{code}' already exists"
        )
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
