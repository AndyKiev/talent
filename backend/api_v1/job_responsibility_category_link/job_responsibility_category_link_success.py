from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


class JobResponsibilityCategoryLinkCreateSuccess(CreateSuccess):
    message_key = "jobResponsibilityCategoryLinkCreateSuccess"

    def __init__(self, link_id: int) -> None:
        self.template_vars = {"linkId": link_id}
        self.fallback = "Job responsibility category link created"
        DomainSuccess.__init__(self, self.fallback)


class JobResponsibilityCategoryLinkUpdateSuccess(UpdateSuccess):
    message_key = "jobResponsibilityCategoryLinkUpdateSuccess"

    def __init__(self, link_id: int) -> None:
        self.template_vars = {"linkId": link_id}
        self.fallback = "Job responsibility category link updated"
        DomainSuccess.__init__(self, self.fallback)


class JobResponsibilityCategoryLinkDeleteSuccess(DeleteSuccess):
    message_key = "jobResponsibilityCategoryLinkDeleteSuccess"

    def __init__(self, link_id: int) -> None:
        self.template_vars = {"linkId": link_id}
        self.fallback = "Job responsibility category link deleted"
        DomainSuccess.__init__(self, self.fallback)
