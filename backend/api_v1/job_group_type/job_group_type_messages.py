from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    DeleteError,
    DomainError,
)
from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


class JobGroupTypeNotFound(NotFoundError):
    message_key = "jobGroupTypeNotFound"

    def __init__(self, job_group_type_id: int) -> None:
        self.template_vars = {"jobGroupTypeId": job_group_type_id}
        self.fallback = f"Job group type with ID {job_group_type_id} not found"
        super().__init__("JobGroupType", "id", job_group_type_id)


class JobGroupTypeNameTaken(AlreadyExistsError):
    message_key = "jobGroupTypeNameTaken"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Job group type with name '{name}' already exists"
        super().__init__("JobGroupType", "name", name)


class JobGroupTypeDeleteError(DeleteError):
    message_key = "jobGroupTypeDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Job group type '{name}' cannot be deleted because it is "
            "referenced by other records"
        )
        DomainError.__init__(self, self.fallback)


class JobGroupTypeDeleteSuccess(DeleteSuccess):
    message_key = "jobGroupTypeDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Job group type '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class JobGroupTypeCreateSuccess(CreateSuccess):
    message_key = "jobGroupTypeCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Job group type '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class JobGroupTypeUpdateSuccess(UpdateSuccess):
    message_key = "jobGroupTypeUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Job group type '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
