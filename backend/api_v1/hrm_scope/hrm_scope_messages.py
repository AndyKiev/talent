from backend.api_v1.base.errors import (
    NotFoundError,
    DomainError,
    DeleteError,
)
from backend.api_v1.base.success import (
    DomainSuccess,
    CreateSuccess,
    UpdateSuccess,
    DeleteSuccess,
)


class HrmScopeNotFound(NotFoundError):
    message_key = "hrmScopeNotFound"

    def __init__(self, scope_id: int) -> None:
        self.template_vars = {"scopeId": scope_id}
        self.fallback = f"HRM scope with ID {scope_id} not found"
        super().__init__("HrmScope", "id", scope_id)


class HrmScopeStartAfterEnd(DomainError):
    message_key = "startDateAfterEndDate"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Start date cannot be after end date"
        DomainError.__init__(self, self.fallback)


class HrmScopeEmployeeNotHrm(DomainError):
    """Refuse to scope an employee that does not hold the HRM group."""

    message_key = "hrmScopeEmployeeNotHrm"

    def __init__(self, employee_name: str) -> None:
        self.template_vars = {"name": employee_name}
        self.fallback = (
            f"Employee '{employee_name}' does not hold the HRM group "
            f"and cannot be assigned a supervision scope"
        )
        DomainError.__init__(self, self.fallback)


class HrmScopeDeleteError(DeleteError):
    message_key = "hrmScopeDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"HRM scope '{name}' cannot be deleted"
        DomainError.__init__(self, self.fallback)


class HrmScopeCreateSuccess(CreateSuccess):
    message_key = "hrmScopeCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Department '{name}' successfully added to scope"
        DomainSuccess.__init__(self, self.fallback)


class HrmScopeUpdateSuccess(UpdateSuccess):
    message_key = "hrmScopeUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Scope for '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)


class HrmScopeDeleteSuccess(DeleteSuccess):
    message_key = "hrmScopeDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Department '{name}' successfully removed from scope"
        DomainSuccess.__init__(self, self.fallback)
