from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    DomainError,
    DeleteError,
)


class DepartmentTypeNotFound(NotFoundError):
    message_key = "departmentTypeNotFound"

    def __init__(self, type_id: int) -> None:
        self.template_vars = {"typeId": type_id}
        self.fallback = f"Department type with ID {type_id} not found"
        super().__init__("DepartmentType", "id", type_id)


class DepartmentTypeNotFoundByName(NotFoundError):
    message_key = "departmentTypeNotFoundByName"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Department type with name '{name}' not found"
        super().__init__("DepartmentType", "name", name)


class DepartmentTypeNameTaken(AlreadyExistsError):
    message_key = "departmentTypeNameTaken"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Department type with name '{name}' already exists"
        super().__init__("DepartmentType", "name", name)


class DepartmentTypeDeleteError(DeleteError):
    message_key = "departmentTypeDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Department type '{name}' cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)
