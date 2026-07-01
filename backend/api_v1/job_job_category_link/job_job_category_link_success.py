from backend.api_v1.base.success import DomainSuccess


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
