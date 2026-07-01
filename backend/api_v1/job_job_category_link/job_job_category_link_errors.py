from backend.api_v1.base.errors import NotFoundError


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
