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
)


class PlanCategoryDefaultNotFound(NotFoundError):
    message_key = "planCategoryDefaultNotFound"

    def __init__(self, default_id: int) -> None:
        self.template_vars = {"defaultId": default_id}
        self.fallback = f"Plan category default with ID {default_id} not found"
        super().__init__("PlanCategoryDefault", "id", default_id)


class PlanCategoryDefaultExists(AlreadyExistsError):
    message_key = "planCategoryDefaultExists"

    def __init__(self, category_id: int) -> None:
        self.template_vars = {"categoryId": category_id}
        self.fallback = (
            f"Department category {category_id} is already in the planning defaults"
        )
        super().__init__("PlanCategoryDefault", "department_category_id", category_id)


class PlanCategoryDefaultDeleteError(DeleteError):
    message_key = "planCategoryDefaultDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Plan category default '{name}' cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)


class PlanCategoryDefaultCreateSuccess(CreateSuccess):
    message_key = "planCategoryDefaultCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Category '{name}' added to planning defaults"
        DomainSuccess.__init__(self, self.fallback)


class PlanCategoryDefaultDeleteSuccess(DeleteSuccess):
    message_key = "planCategoryDefaultDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Category '{name}' removed from planning defaults"
        DomainSuccess.__init__(self, self.fallback)
