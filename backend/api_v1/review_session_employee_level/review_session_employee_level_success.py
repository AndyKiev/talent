from backend.api_v1.base.success import DomainSuccess, UpdateSuccess


class ProposedLevelSaveSuccess(UpdateSuccess):
    message_key = "proposedLevelSaveSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Proposed level saved successfully"
        DomainSuccess.__init__(self, self.fallback)
