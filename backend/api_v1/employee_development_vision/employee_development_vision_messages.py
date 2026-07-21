from backend.api_v1.base.success import DomainSuccess


class DevelopmentVisionSaveSuccess(DomainSuccess):
    message_key = "developmentVisionSaveSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Development vision saved"
        DomainSuccess.__init__(self, self.fallback)
