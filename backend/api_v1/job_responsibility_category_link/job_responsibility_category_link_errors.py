from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    DomainError,
    DeleteError,
)


class JobResponsibilityCategoryLinkNotFound(NotFoundError):
    message_key = "jobResponsibilityCategoryLinkNotFound"

    def __init__(self, link_id: int) -> None:
        self.template_vars = {"linkId": link_id}
        self.fallback = f"Job responsibility category link with ID {link_id} not found"
        super().__init__("JobResponsibilityCategoryLink", "id", link_id)


class JobResponsibilityCategoryLinkDuplicate(AlreadyExistsError):
    message_key = "jobResponsibilityCategoryLinkDuplicate"

    def __init__(self, job_id: int, category_id: int) -> None:
        self.template_vars = {"jobId": job_id, "categoryId": category_id}
        self.fallback = (
            f"Job {job_id} is already linked to department category {category_id}"
        )
        super().__init__(
            "JobResponsibilityCategoryLink", "job_id+department_category_id",
            f"{job_id}+{category_id}",
        )


class JobResponsibilityCategoryLinkDeleteError(DeleteError):
    message_key = "jobResponsibilityCategoryLinkDeleteError"

    def __init__(self, link_id: int) -> None:
        self.template_vars = {"linkId": link_id}
        self.fallback = (
            f"Job responsibility category link {link_id} cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)
