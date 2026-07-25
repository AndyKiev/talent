from backend.api_v1.base.errors import (
    AlreadyExistsError,
    DeleteError,
    DomainError,
    NotFoundError,
    RelationshipError,
)
from backend.api_v1.base.success import (
    CreateSuccess,
    DeleteSuccess,
    DomainSuccess,
    UpdateSuccess,
)


class DepartmentJobTargetNotFound(NotFoundError):
    message_key = "departmentJobTargetNotFound"

    def __init__(self, target_id: int) -> None:
        self.template_vars = {"targetId": target_id}
        self.fallback = f"Department job target with ID {target_id} not found"
        super().__init__("DepartmentJobTarget", "id", target_id)


class DepartmentJobTargetAlreadyExists(AlreadyExistsError):
    message_key = "departmentJobTargetAlreadyExists"

    def __init__(self, effective_date: str) -> None:
        self.template_vars = {"date": effective_date}
        self.fallback = (
            f"A target for this department and job dated {effective_date} "
            f"already exists"
        )
        DomainError.__init__(self, self.fallback)


class DepartmentJobTargetTypeMismatch(RelationshipError):
    message_key = "departmentJobTargetTypeMismatch"

    def __init__(self, department_name: str, job_name: str) -> None:
        self.template_vars = {"departmentName": department_name, "jobName": job_name}
        self.fallback = (
            f"Job '{job_name}' is not linked to the type of department "
            f"'{department_name}'"
        )
        DomainError.__init__(self, self.fallback)


class DepartmentJobTargetDeleteError(DeleteError):
    message_key = "departmentJobTargetDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Department job target '{name}' cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)


class DepartmentJobTargetCreateSuccess(CreateSuccess):
    message_key = "departmentJobTargetCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Target '{name}' successfully saved"
        DomainSuccess.__init__(self, self.fallback)


class DepartmentJobTargetUpdateSuccess(UpdateSuccess):
    message_key = "departmentJobTargetUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Target '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)


class DepartmentJobTargetDeleteSuccess(DeleteSuccess):
    message_key = "departmentJobTargetDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Target '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)
