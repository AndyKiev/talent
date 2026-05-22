from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    DomainError,
    DeleteError,
)


class TalentStatusPeriodLinkNotFound(NotFoundError):
    message_key = "talentStatusPeriodLinkNotFound"

    def __init__(self, link_id: int) -> None:
        self.template_vars = {"linkId": link_id}
        self.fallback = f"Talent status–period link with ID {link_id} not found"
        super().__init__("TalentStatusPeriodLink", "id", link_id)


class TalentStatusPeriodLinkAlreadyExists(AlreadyExistsError):
    message_key = "talentStatusPeriodLinkAlreadyExists"

    def __init__(self, status_id: int, period_id: int) -> None:
        self.template_vars = {"statusId": status_id, "periodId": period_id}
        self.fallback = (
            f"Link between talent status ID {status_id} "
            f"and talent period ID {period_id} already exists"
        )
        DomainError.__init__(self, self.fallback)


class TalentStatusPeriodLinkDeleteError(DeleteError):
    message_key = "talentStatusPeriodLinkDeleteError"

    def __init__(self, link_id: int) -> None:
        self.template_vars = {"linkId": link_id}
        self.fallback = (
            f"Talent status–period link ID {link_id} cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)

class TalentStatusPeriodLinkNotFoundByCompositeKey(NotFoundError):
    message_key = "talentStatusPeriodLinkNotFoundByCompositeKey"

    def __init__(self, status_id: int, period_id: int) -> None:
        self.template_vars = {"statusId": status_id, "periodId": period_id}
        self.fallback = (
            f"Talent status–period link for "
            f"status ID {status_id} and period ID {period_id} not found"
        )
        DomainError.__init__(self, self.fallback)