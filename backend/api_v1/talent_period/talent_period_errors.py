from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    DomainError,
    DeleteError,
)


class TalentPeriodNotFound(NotFoundError):
    message_key = "talentPeriodNotFound"

    def __init__(self, period_id: int) -> None:
        self.template_vars = {"periodId": period_id}
        self.fallback = f"Talent period with ID {period_id} not found"
        super().__init__("TalentPeriod", "id", period_id)


class TalentPeriodNotFoundByName(NotFoundError):
    message_key = "talentPeriodNotFoundByName"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Talent period with name '{name}' not found"
        super().__init__("TalentPeriod", "name", name)


class TalentPeriodNameTaken(AlreadyExistsError):
    message_key = "talentPeriodNameTaken"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Talent period with name '{name}' already exists"
        super().__init__("TalentPeriod", "name", name)


class TalentPeriodDeleteError(DeleteError):
    message_key = "talentPeriodDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Talent period '{name}' cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)
