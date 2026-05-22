from backend.api_v1.base.success import DomainSuccess, DeleteSuccess, CreateSuccess, UpdateSuccess


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
