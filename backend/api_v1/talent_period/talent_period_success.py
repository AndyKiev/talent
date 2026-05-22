from backend.api_v1.base.success import DomainSuccess, DeleteSuccess, CreateSuccess, UpdateSuccess


class TalentPeriodDeleteSuccess(DeleteSuccess):
    message_key = "talentPeriodDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Talent period '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class TalentPeriodCreateSuccess(CreateSuccess):
    message_key = "talentPeriodCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Talent period '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class TalentPeriodUpdateSuccess(UpdateSuccess):
    message_key = "talentPeriodUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Talent period '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
