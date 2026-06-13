from backend.api_v1.base.success import DomainSuccess, UpdateSuccess


class ProposedLevelSaveSuccess(UpdateSuccess):
    message_key = "proposedLevelSaveSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Proposed level saved successfully"
        DomainSuccess.__init__(self, self.fallback)


class ProposedLevelDeleteSuccess(UpdateSuccess):
    message_key = "proposedLevelDeleteSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Proposed level deleted successfully"
        DomainSuccess.__init__(self, self.fallback)


class ProposedLevelStatusUpdateSuccess(UpdateSuccess):
    message_key = "proposedLevelStatusUpdateSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Proposed level status updated"
        DomainSuccess.__init__(self, self.fallback)
