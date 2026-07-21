from backend.api_v1.base.success import DomainSuccess


class MissionDimensionLinkSetSuccess(DomainSuccess):
    message_key = "missionDimensionLinkSetSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Competence set for the mission"
        DomainSuccess.__init__(self, self.fallback)


class MissionDimensionLinkClearSuccess(DomainSuccess):
    message_key = "missionDimensionLinkClearSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Competence removed from the mission"
        DomainSuccess.__init__(self, self.fallback)
