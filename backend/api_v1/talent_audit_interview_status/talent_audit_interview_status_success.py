from backend.api_v1.base.success import (
    CreateSuccess,
    DeleteSuccess,
    DomainSuccess,
    UpdateSuccess,
)


class TalentAuditInterviewStatusCreateSuccess(CreateSuccess):
    message_key = "talentAuditInterviewStatusCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Talent audit interview status '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class TalentAuditInterviewStatusUpdateSuccess(UpdateSuccess):
    message_key = "talentAuditInterviewStatusUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Talent audit interview status '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)


class TalentAuditInterviewStatusDeleteSuccess(DeleteSuccess):
    message_key = "talentAuditInterviewStatusDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Talent audit interview status '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)
