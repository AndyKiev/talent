from backend.api_v1.base.errors import NotFoundError, DomainError, DeleteError
from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


class InterviewNotFound(NotFoundError):
    message_key = "interviewNotFound"

    def __init__(self, interview_id: int) -> None:
        self.template_vars = {"id": interview_id}
        self.fallback = f"Interview with ID {interview_id} not found"
        super().__init__("Interview", "id", interview_id)


class InterviewInterviewerNotManager(DomainError):
    message_key = "interviewInterviewerNotManager"

    def __init__(self, names: str) -> None:
        self.template_vars = {"names": names}
        self.fallback = (
            f"Only employees holding a manager-category job can interview: {names}"
        )
        super().__init__(self.fallback)


class InterviewTooManyInterviewers(DomainError):
    message_key = "interviewTooManyInterviewers"

    def __init__(self, max_count: int) -> None:
        self.template_vars = {"max": max_count}
        self.fallback = f"An interview may have at most {max_count} interviewers"
        super().__init__(self.fallback)


class InterviewerGroupMissing(DomainError):
    message_key = "interviewerGroupMissing"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = (
            "The 'Interviewer' access group is missing — run the Phase B migration/seed"
        )
        super().__init__(self.fallback)


class InterviewDeleteError(DeleteError):
    message_key = "interviewDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Interview {name} cannot be deleted"
        DomainError.__init__(self, self.fallback)


class InterviewDeleteSuccess(DeleteSuccess):
    message_key = "interviewDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = "Interview deleted"
        DomainSuccess.__init__(self, self.fallback)


class InterviewCreateSuccess(CreateSuccess):
    message_key = "interviewCreateSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Interview scheduled"
        DomainSuccess.__init__(self, self.fallback)


class InterviewUpdateSuccess(UpdateSuccess):
    message_key = "interviewUpdateSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Interview updated"
        DomainSuccess.__init__(self, self.fallback)


class InterviewFeedbackCreateSuccess(CreateSuccess):
    message_key = "interviewFeedbackCreateSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Feedback added"
        DomainSuccess.__init__(self, self.fallback)
