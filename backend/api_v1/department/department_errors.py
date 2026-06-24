from backend.api_v1.base.errors import (
    NotFoundError,
    DomainError,
    DeleteError,
)


class DepartmentNotFound(NotFoundError):
    message_key = "departmentNotFound"

    def __init__(self, department_id: int) -> None:
        self.template_vars = {"departmentId": department_id}
        self.fallback = f"Department with ID {department_id} not found"
        super().__init__("Department", "id", department_id)


class DepartmentNotFoundByName(NotFoundError):
    message_key = "departmentNotFoundByName"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Department with name '{name}' not found"
        super().__init__("Department", "name", name)


class DepartmentDeleteError(DeleteError):
    message_key = "departmentDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Department '{name}' cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)


class DepartmentCircularReferenceError(DomainError):
    """Raised when assigning a department as its own ancestor."""

    message_key = "departmentCircularReference"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Cannot set parent of department '{name}' — "
            f"the selected parent is a descendant of this department"
        )
        super().__init__(self.fallback)


class DepartmentGenerateCategoryNotFound(NotFoundError):
    """
    Raised during subtree generation when the resolved target category
    (e.g. 'store_departments', 'office_departments', 'not_specified') has
    no matching row in department_categories (lookup by key).
    """

    message_key = "departmentGenerateCategoryNotFound"

    def __init__(self, category_key: str) -> None:
        self.template_vars = {"categoryKey": category_key}
        self.fallback = (
            f"Cannot generate subtree: no department category with key "
            f"'{category_key}' exists. Create it first."
        )
        super().__init__("DepartmentCategory", "key", category_key)
