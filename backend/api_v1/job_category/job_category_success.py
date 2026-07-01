from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


class JobCategoryCreateSuccess(CreateSuccess):
    message_key = "jobCategoryCreateSuccess"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Job category '{key}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class JobCategoryUpdateSuccess(UpdateSuccess):
    message_key = "jobCategoryUpdateSuccess"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Job category '{key}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)


class JobCategoryDeleteSuccess(DeleteSuccess):
    message_key = "jobCategoryDeleteSuccess"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Job category '{key}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)
