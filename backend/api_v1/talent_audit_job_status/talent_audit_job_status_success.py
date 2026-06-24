from backend.api_v1.base.success import (
    CreateSuccess,
    DeleteSuccess,
    DomainSuccess,
    UpdateSuccess,
)


class TalentAuditJobStatusCreateSuccess(CreateSuccess):
    message_key = "talentAuditJobStatusCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Talent audit job status '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class TalentAuditJobStatusUpdateSuccess(UpdateSuccess):
    message_key = "talentAuditJobStatusUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Talent audit job status '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)


class TalentAuditJobStatusDeleteSuccess(DeleteSuccess):
    message_key = "talentAuditJobStatusDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Talent audit job status '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)
