from backend.api_v1.base.errors import DeleteError, DomainError, NotFoundError


class TalentAuditJobNotFound(NotFoundError):
    message_key = "talentAuditJobNotFound"

    def __init__(self, job_id: int) -> None:
        self.template_vars = {"jobId": job_id}
        self.fallback = f"Talent audit job with ID {job_id} not found"
        super().__init__("TalentAuditJob", "id", job_id)


class TalentAuditJobDeleteError(DeleteError):
    message_key = "talentAuditJobDeleteError"

    def __init__(self, job_id: int) -> None:
        self.template_vars = {"jobId": job_id}
        self.fallback = (
            f"Talent audit job with ID {job_id} cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)
