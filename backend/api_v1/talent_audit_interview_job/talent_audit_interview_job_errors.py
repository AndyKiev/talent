from backend.api_v1.base.errors import DeleteError, DomainError, NotFoundError


class TalentAuditInterviewJobNotFound(NotFoundError):
    message_key = "talentAuditInterviewJobNotFound"

    def __init__(self, record_id: int) -> None:
        self.template_vars = {"recordId": record_id}
        self.fallback = f"Talent audit interview job with ID {record_id} not found"
        super().__init__("TalentAuditInterviewJob", "id", record_id)


class TalentAuditInterviewJobDeleteError(DeleteError):
    message_key = "talentAuditInterviewJobDeleteError"

    def __init__(self, record_id: int) -> None:
        self.template_vars = {"recordId": record_id}
        self.fallback = (
            f"Talent audit interview job with ID {record_id} cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)


class TalentAuditInterviewJobDuplicate(DomainError):
    message_key = "talentAuditInterviewJobDuplicate"

    def __init__(self, interview_id: int, audit_job_id: int) -> None:
        self.template_vars = {"interviewId": interview_id, "auditJobId": audit_job_id}
        self.fallback = (
            f"Interview {interview_id} already has an assessment for audit job {audit_job_id}"
        )
        super().__init__(self.fallback)
