from backend.api_v1.base.errors import NotFoundError
from backend.api_v1.base.success import DomainSuccess


class JobNotFoundForCategoryLink(NotFoundError):
    message_key = "jobNotFoundForCategoryLink"

    def __init__(self, job_id: int) -> None:
        self.template_vars = {"jobId": job_id}
        self.fallback = f"Job with ID {job_id} not found"
        super().__init__("Job", "id", job_id)


class JobCategoryNotFoundForLink(NotFoundError):
    message_key = "jobCategoryNotFoundForLink"

    def __init__(self, job_category_id: int) -> None:
        self.template_vars = {"jobCategoryId": job_category_id}
        self.fallback = f"Job category with ID {job_category_id} not found"
        super().__init__("JobCategory", "id", job_category_id)


class JobCategoryLinkSetSuccess(DomainSuccess):
    message_key = "jobCategoryLinkSetSuccess"

    def __init__(self, category: str, job: str) -> None:
        self.template_vars = {"category": category, "job": job}
        self.fallback = f"Category '{category}' set for job '{job}'"
        DomainSuccess.__init__(self, self.fallback)


class JobCategoryLinkClearAllSuccess(DomainSuccess):
    message_key = "jobCategoryLinkClearAllSuccess"

    def __init__(self, count: int) -> None:
        self.template_vars = {"count": count}
        self.fallback = f"Removed job category from {count} job(s)"
        DomainSuccess.__init__(self, self.fallback)
