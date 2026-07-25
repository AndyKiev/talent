from backend.api_v1.base.errors import (
    AlreadyExistsError,
    DeleteError,
    DomainError,
    NotFoundError,
)
from backend.api_v1.base.success import (
    CreateSuccess,
    DeleteSuccess,
    DomainSuccess,
    UpdateSuccess,
)


class TalentStatusPeriodLinkNotFound(NotFoundError):
    message_key = "talentStatusPeriodLinkNotFound"

    def __init__(self, link_id: int) -> None:
        self.template_vars = {"linkId": link_id}
        self.fallback = f"Talent status–period link with ID {link_id} not found"
        super().__init__("TalentStatusPeriodLink", "id", link_id)


class TalentStatusPeriodLinkAlreadyExists(AlreadyExistsError):
    message_key = "talentStatusPeriodLinkAlreadyExists"

    def __init__(self, status_name: str, period_name: str) -> None:
        self.template_vars = {"statusName": status_name, "periodName": period_name}
        self.fallback = (
            f"Link between talent status '{status_name}' "
            f"and talent period '{period_name}' already exists"
        )
        DomainError.__init__(self, self.fallback)


class TalentStatusPeriodLinkDeleteError(DeleteError):
    message_key = "talentStatusPeriodLinkDeleteError"

    def __init__(self, name: str) -> None:
        # `name` is the human label ("status – period"), passed by delete_by_id.
        self.template_vars = {"name": name}
        self.fallback = (
            f"Talent status–period link '{name}' cannot be deleted "
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


class TalentStatusPeriodLinkDeleteSuccess(DeleteSuccess):
    message_key = "talentStatusPeriodLinkDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Talent status–period link '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class TalentStatusPeriodLinkCreateSuccess(CreateSuccess):
    message_key = "talentStatusPeriodLinkCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Talent status–period link '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class TalentStatusPeriodLinkUpdateSuccess(UpdateSuccess):
    message_key = "talentStatusPeriodLinkUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Talent status–period link '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
