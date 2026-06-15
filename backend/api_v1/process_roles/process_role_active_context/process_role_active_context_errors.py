from backend.api_v1.base.errors import DomainError


class ActiveContextRoleNotHeld(DomainError):
    message_key = "activeContextRoleNotHeld"

    def __init__(self, process_role_id: int) -> None:
        self.template_vars = {"id": process_role_id}
        self.fallback = f"You do not hold role {process_role_id} in this process"
        DomainError.__init__(self, self.fallback)


class ActiveContextDepartmentNotAssigned(DomainError):
    message_key = "activeContextDepartmentNotAssigned"

    def __init__(self, department_id: int) -> None:
        self.template_vars = {"id": department_id}
        self.fallback = f"Department {department_id} is not assigned to you for this role"
        DomainError.__init__(self, self.fallback)
