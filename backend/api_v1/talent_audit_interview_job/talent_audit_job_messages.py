from backend.api_v1.base.errors import DeleteError, DomainError, NotFoundError


class TalentAuditJobNotFound(NotFoundError):
    message_key = "talentAuditJobNotFound"

    def __init__(self, record_id: int) -> None:
        self.template_vars = {"recordId": record_id}
        self.fallback = f"Talent audit job with ID {record_id} not found"
        super().__init__("TalentAuditJob", "id", record_id)


class TalentAuditJobDeleteError(DeleteError):
    message_key = "talentAuditJobDeleteError"

    def __init__(self, record_id: int) -> None:
        self.template_vars = {"recordId": record_id}
        self.fallback = (
            f"Talent audit job with ID {record_id} cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)


class TalentAuditJobPeriodNotAscending(DomainError):
    message_key = "talentAuditJobPeriodNotAscending"

    def __init__(self, new_qty: int, max_existing: int) -> None:
        self.template_vars = {"newQty": new_qty, "maxExisting": max_existing}
        self.fallback = (
            f"Period {new_qty} months must be greater than existing max "
            f"{max_existing} months"
        )
        super().__init__(self.fallback)


class TalentAuditJobDuplicatePeriod(DomainError):
    message_key = "talentAuditJobDuplicatePeriod"

    def __init__(self, qty_months: int) -> None:
        self.template_vars = {"qtyMonths": qty_months}
        self.fallback = (
            f"A job with period {qty_months} months already exists for this audit"
        )
        super().__init__(self.fallback)
