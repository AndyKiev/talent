from backend.api_v1.base.errors import (
    AlreadyExistsError,
    DeleteError,
    DomainError,
    NotFoundError,
)
from backend.api_v1.base.success import (
    CreateSuccess,
    DeleteSuccess,
    DomainSuccess,
    UpdateSuccess,
)


class DepartmentTypeParentalLinkNotFound(NotFoundError):
    message_key = "departmentTypeParentalLinkNotFound"

    def __init__(self, link_id: int) -> None:
        self.template_vars = {"linkId": link_id}
        self.fallback = f"Department type parental link with ID {link_id} not found"
        super().__init__("DepartmentTypeParentalLink", "id", link_id)


class DepartmentTypeParentalLinkAlreadyExists(AlreadyExistsError):
    message_key = "departmentTypeParentalLinkAlreadyExists"

    def __init__(self, child_id: int, parent_id: int) -> None:
        self.template_vars = {"childId": child_id, "parentId": parent_id}
        self.fallback = (
            f"Link between child {child_id} and parent {parent_id} already exists"
        )
        super().__init__(
            "DepartmentTypeParentalLink", "child_parent", f"{child_id}-{parent_id}"
        )


class DepartmentTypeParentalLinkDeleteError(DeleteError):
    message_key = "departmentTypeParentalLinkDeleteError"

    def __init__(self, name: str) -> None:  # <-- Changed to match base service pattern
        self.template_vars = {"name": name}
        self.fallback = f"Department type parental link '{name}' cannot be deleted"
        DomainError.__init__(self, self.fallback)


class DepartmentTypeParentalLinkDeleteSuccess(DeleteSuccess):
    message_key = "departmentTypeParentalLinkDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Department type parental link '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class DepartmentTypeParentalLinkCreateSuccess(CreateSuccess):
    message_key = "departmentTypeParentalLinkCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Department type parental link '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class DepartmentTypeParentalLinkUpdateSuccess(UpdateSuccess):
    message_key = "departmentTypeParentalLinkUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Department type parental link '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
