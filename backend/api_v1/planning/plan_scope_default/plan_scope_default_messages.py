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
)


class PlanScopeDefaultNotFound(NotFoundError):
    message_key = "planScopeDefaultNotFound"

    def __init__(self, default_id: int) -> None:
        self.template_vars = {"defaultId": default_id}
        self.fallback = f"Plan scope default with ID {default_id} not found"
        super().__init__("PlanScopeDefault", "id", default_id)


class PlanScopeDefaultExists(AlreadyExistsError):
    message_key = "planScopeDefaultExists"

    def __init__(self, value: str) -> None:
        self.template_vars = {"value": value}
        self.fallback = (
            f"This planning scope profile '{value}' already exists in the defaults"
        )
        super().__init__("PlanScopeDefault", "job_group/talent_status", value)


class PlanScopeDefaultDeleteError(DeleteError):
    message_key = "planScopeDefaultDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Plan scope default '{name}' cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)


class PlanScopeDefaultCreateSuccess(CreateSuccess):
    message_key = "planScopeDefaultCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Scope profile '{name}' added to planning defaults"
        DomainSuccess.__init__(self, self.fallback)


class PlanScopeDefaultDeleteSuccess(DeleteSuccess):
    message_key = "planScopeDefaultDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Scope profile '{name}' removed from planning defaults"
        DomainSuccess.__init__(self, self.fallback)
