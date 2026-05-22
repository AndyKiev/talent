from backend.api_v1.base.errors import DeleteError, DomainError, NotFoundError


class TalentAuditInterviewNotFound(NotFoundError):
    message_key = "talentAuditInterviewNotFound"

    def __init__(self, interview_id: int) -> None:
        self.template_vars = {"interviewId": interview_id}
        self.fallback = f"Talent audit interview with ID {interview_id} not found"
        super().__init__("TalentAuditInterview", "id", interview_id)


class TalentAuditInterviewDeleteError(DeleteError):
    message_key = "talentAuditInterviewDeleteError"

    def __init__(self, interview_id: int) -> None:
        self.template_vars = {"interviewId": interview_id}
        self.fallback = (
            f"Talent audit interview with ID {interview_id} cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)
