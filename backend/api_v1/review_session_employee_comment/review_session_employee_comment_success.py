from backend.api_v1.base.success import DomainSuccess, UpdateSuccess


class ReviewCommentCreateSuccess(UpdateSuccess):
    message_key = "reviewCommentCreateSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Note added"
        DomainSuccess.__init__(self, self.fallback)


class ReviewCommentUpdateSuccess(UpdateSuccess):
    message_key = "reviewCommentUpdateSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Note updated"
        DomainSuccess.__init__(self, self.fallback)


class ReviewCommentDeleteSuccess(UpdateSuccess):
    message_key = "reviewCommentDeleteSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Note deleted"
        DomainSuccess.__init__(self, self.fallback)
