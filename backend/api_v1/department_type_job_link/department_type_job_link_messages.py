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


class DepartmentTypeJobLinkNotFound(NotFoundError):
    message_key = "departmentTypeJobLinkNotFound"

    def __init__(self, link_id: int) -> None:
        self.template_vars = {"linkId": link_id}
        self.fallback = f"Department type–job link with ID {link_id} not found"
        super().__init__("DepartmentTypeJobLink", "id", link_id)


class DepartmentTypeJobLinkAlreadyExists(AlreadyExistsError):
    message_key = "departmentTypeJobLinkAlreadyExists"

    def __init__(self, department_type_id: int, job_id: int) -> None:
        self.template_vars = {"departmentTypeId": department_type_id, "jobId": job_id}
        self.fallback = (
            f"Link between department type ID {department_type_id} "
            f"and job ID {job_id} already exists"
        )
        DomainError.__init__(self, self.fallback)


class DepartmentTypeJobLinkDeleteError(DeleteError):
    message_key = "departmentTypeJobLinkDeleteError"

    def __init__(self, link_id: int) -> None:
        self.template_vars = {"linkId": link_id}
        self.fallback = (
            f"Department type–job link ID {link_id} cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)


class DepartmentTypeJobLinkNotFoundByCompositeKey(NotFoundError):
    message_key = "departmentTypeJobLinkNotFoundByCompositeKey"

    def __init__(self, department_type_id: int, job_id: int) -> None:
        self.template_vars = {"departmentTypeId": department_type_id, "jobId": job_id}
        self.fallback = (
            f"Department type–job link for "
            f"department type ID {department_type_id} and job ID {job_id} not found"
        )
        DomainError.__init__(self, self.fallback)


class DepartmentTypeJobLinkDeleteSuccess(DeleteSuccess):
    message_key = "departmentTypeJobLinkDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Department type–job link '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class DepartmentTypeJobLinkCreateSuccess(CreateSuccess):
    message_key = "departmentTypeJobLinkCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Department type–job link '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class DepartmentTypeJobLinkUpdateSuccess(UpdateSuccess):
    message_key = "departmentTypeJobLinkUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Department type–job link '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)


class DepartmentTypeJobLinkBulkSyncSuccess(DomainSuccess):
    message_key = "departmentTypeJobLinkBulkSyncSuccess"

    def __init__(self, created: int, removed: int) -> None:
        self.template_vars = {"created": created, "removed": removed}
        self.fallback = f"Links updated: {created} added, {removed} removed"
        DomainSuccess.__init__(self, self.fallback)
