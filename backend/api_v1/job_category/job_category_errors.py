from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    DomainError,
    DeleteError,
)


class JobCategoryNotFound(NotFoundError):
    message_key = "jobCategoryNotFound"

    def __init__(self, category_id: int) -> None:
        self.template_vars = {"categoryId": category_id}
        self.fallback = f"Job category with ID {category_id} not found"
        super().__init__("JobCategory", "id", category_id)


class JobCategoryNotFoundByKey(NotFoundError):
    message_key = "jobCategoryNotFoundByKey"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Job category with key '{key}' not found"
        super().__init__("JobCategory", "key", key)


class JobCategoryKeyTaken(AlreadyExistsError):
    message_key = "jobCategoryKeyTaken"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Job category with key '{key}' already exists"
        super().__init__("JobCategory", "key", key)


class JobCategoryDeleteError(DeleteError):
    message_key = "jobCategoryDeleteError"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = (
            f"Job category '{key}' cannot be deleted because it is "
            f"referenced by other records"
        )
        DomainError.__init__(self, self.fallback)
