from backend.api_v1.base.success import DomainSuccess, DeleteSuccess, CreateSuccess, UpdateSuccess


class TalentStatusDeleteSuccess(DeleteSuccess):
    message_key = "talentStatusDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Talent status '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class TalentStatusCreateSuccess(CreateSuccess):
    message_key = "talentStatusCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Talent status '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class TalentStatusUpdateSuccess(UpdateSuccess):
    message_key = "talentStatusUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Talent status '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
