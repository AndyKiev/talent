from backend.api_v1.base.errors import DeleteError, DomainError, NotFoundError
from backend.api_v1.base.success import (
    CreateSuccess,
    DeleteSuccess,
    DomainSuccess,
    UpdateSuccess,
)


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


class TalentAuditInterviewNoFreeJobs(DomainError):
    message_key = "talentAuditInterviewNoFreeJobs"

    def __init__(self, audit_id: int) -> None:
        self.template_vars = {"auditId": audit_id}
        self.fallback = (
            f"No available (free) audit jobs with 'created' status "
            f"for talent audit {audit_id}"
        )
        super().__init__(self.fallback)


class TalentAuditInterviewPeriodsNotAscending(DomainError):
    message_key = "talentAuditInterviewPeriodsNotAscending"

    def __init__(self, current_qty: int, previous_qty: int) -> None:
        self.template_vars = {"currentQty": current_qty, "previousQty": previous_qty}
        self.fallback = (
            f"HRS period {current_qty} months must be greater than "
            f"previous {previous_qty} months"
        )
        super().__init__(self.fallback)


class TalentAuditInterviewDuplicatePeriod(DomainError):
    message_key = "talentAuditInterviewDuplicatePeriod"

    def __init__(self, qty_months: int) -> None:
        self.template_vars = {"qtyMonths": qty_months}
        self.fallback = (
            f"Duplicate HRS period: {qty_months} months is already "
            f"assigned to another job in this interview"
        )
        super().__init__(self.fallback)


class TalentAuditInterviewCreateSuccess(CreateSuccess):
    message_key = "talentAuditInterviewCreateSuccess"

    def __init__(self, interview_id: int) -> None:
        self.template_vars = {"interviewId": interview_id}
        self.fallback = (
            f"Talent audit interview with ID {interview_id} successfully created"
        )
        DomainSuccess.__init__(self, self.fallback)


class TalentAuditInterviewUpdateSuccess(UpdateSuccess):
    message_key = "talentAuditInterviewUpdateSuccess"

    def __init__(self, interview_id: int) -> None:
        self.template_vars = {"interviewId": interview_id}
        self.fallback = (
            f"Talent audit interview with ID {interview_id} successfully updated"
        )
        DomainSuccess.__init__(self, self.fallback)


class TalentAuditInterviewDeleteSuccess(DeleteSuccess):
    message_key = "talentAuditInterviewDeleteSuccess"

    def __init__(self, interview_id: int) -> None:
        self.template_vars = {"interviewId": interview_id}
        self.fallback = (
            f"Talent audit interview with ID {interview_id} successfully deleted"
        )
        DomainSuccess.__init__(self, self.fallback)
