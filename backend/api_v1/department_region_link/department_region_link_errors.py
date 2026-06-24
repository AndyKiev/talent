from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    DomainError,
    DeleteError,
    RelationshipError,
)


class DepartmentRegionLinkNotFound(NotFoundError):
    message_key = "departmentRegionLinkNotFound"

    def __init__(self, link_id: int) -> None:
        self.template_vars = {"linkId": link_id}
        self.fallback = f"Department–region link with ID {link_id} not found"
        super().__init__("DepartmentRegionLink", "id", link_id)


class DepartmentRegionLinkNotFoundByDepartment(NotFoundError):
    message_key = "departmentRegionLinkNotFoundByDepartment"

    def __init__(self, department_id: int) -> None:
        self.template_vars = {"departmentId": department_id}
        self.fallback = f"No region link found for department ID {department_id}"
        super().__init__("DepartmentRegionLink", "department_id", department_id)


class DepartmentRegionLinkAlreadyExists(AlreadyExistsError):
    message_key = "departmentRegionLinkAlreadyExists"

    def __init__(self, department_id: int) -> None:
        self.template_vars = {"departmentId": department_id}
        self.fallback = f"Department ID {department_id} already has a region assigned"
        DomainError.__init__(self, self.fallback)


class DepartmentRegionCategoryNotAllowed(RelationshipError):
    message_key = "departmentRegionCategoryNotAllowed"

    def __init__(self, category_name: str, allowed: str) -> None:
        self.template_vars = {"category": category_name, "allowed": allowed}
        self.fallback = (
            f"Department of category '{category_name}' cannot have a region. "
            f"Allowed categories: {allowed}"
        )
        DomainError.__init__(self, self.fallback)


class DepartmentRegionLinkDeleteError(DeleteError):
    message_key = "departmentRegionLinkDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Department–region link '{name}' cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)
