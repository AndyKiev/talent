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


class DepartmentCategoryNotFound(NotFoundError):
    message_key = "departmentCategoryNotFound"

    def __init__(self, category_id: int) -> None:
        self.template_vars = {"categoryId": category_id}
        self.fallback = f"Department category with ID {category_id} not found"
        super().__init__("DepartmentCategory", "id", category_id)


class DepartmentCategoryNotFoundByName(NotFoundError):
    message_key = "departmentCategoryNotFoundByName"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Department category with name '{name}' not found"
        super().__init__("DepartmentCategory", "name", name)


class DepartmentCategoryNameTaken(AlreadyExistsError):
    message_key = "departmentCategoryNameTaken"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Department category with name '{name}' already exists"
        super().__init__("DepartmentCategory", "name", name)


class DepartmentCategoryKeyTaken(AlreadyExistsError):
    message_key = "departmentCategoryKeyTaken"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Department category with key '{key}' already exists"
        super().__init__("DepartmentCategory", "key", key)


class DepartmentCategoryDeleteError(DeleteError):
    message_key = "departmentCategoryDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Department category '{name}' cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)


class DepartmentCategoryDeleteSuccess(DeleteSuccess):
    message_key = "departmentCategoryDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Department category '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class DepartmentCategoryCreateSuccess(CreateSuccess):
    message_key = "departmentCategoryCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Department category '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class DepartmentCategoryUpdateSuccess(UpdateSuccess):
    message_key = "departmentCategoryUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Department category '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
