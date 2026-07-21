from backend.api_v1.base.errors import NotFoundError
from backend.api_v1.base.success import DomainSuccess


class EmployeeMissionCommentNotFound(NotFoundError):
    message_key = "employeeMissionCommentNotFound"

    def __init__(self, comment_id: int) -> None:
        self.template_vars = {"commentId": comment_id}
        self.fallback = f"Comment with ID {comment_id} not found"
        super().__init__("EmployeeMissionComment", "id", comment_id)


class EmployeeMissionCommentCreateSuccess(DomainSuccess):
    message_key = "employeeMissionCommentCreateSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Comment successfully added"
        DomainSuccess.__init__(self, self.fallback)


class EmployeeMissionCommentUpdateSuccess(DomainSuccess):
    message_key = "employeeMissionCommentUpdateSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Comment successfully updated"
        DomainSuccess.__init__(self, self.fallback)


class EmployeeMissionCommentDeleteSuccess(DomainSuccess):
    message_key = "employeeMissionCommentDeleteSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Comment successfully deleted"
        DomainSuccess.__init__(self, self.fallback)
