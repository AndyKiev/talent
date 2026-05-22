from backend.api_v1.base.success import DomainSuccess, DeleteSuccess, CreateSuccess, UpdateSuccess


class TalentAuditStatusDeleteSuccess(DeleteSuccess):
    message_key = "talentAuditStatusDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Talent audit status '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class TalentAuditStatusCreateSuccess(CreateSuccess):
    message_key = "talentAuditStatusCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Talent audit status '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class TalentAuditStatusUpdateSuccess(UpdateSuccess):
    message_key = "talentAuditStatusUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Talent audit status '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
