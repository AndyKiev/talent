from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
)


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
