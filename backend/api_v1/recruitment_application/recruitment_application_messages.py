from backend.api_v1.base.errors import (
    AlreadyExistsError,
    DeleteError,
    DomainError,
    NotFoundError,
)
from backend.api_v1.base.success import (
    CreateSuccess,
    DeleteSuccess,
    DomainSuccess,
)


class RecruitmentApplicationNotFound(NotFoundError):
    message_key = "candidateApplicationNotFound"

    def __init__(self, application_id: int) -> None:
        self.template_vars = {"id": application_id}
        self.fallback = f"Application with ID {application_id} not found"
        super().__init__("RecruitmentApplication", "id", application_id)


class RecruitmentApplicationAlreadyExists(AlreadyExistsError):
    message_key = "candidateApplicationAlreadyExists"

    def __init__(self, candidate_id: int, task_id: int) -> None:
        self.template_vars = {"candidateId": candidate_id, "taskId": task_id}
        self.fallback = "This candidate is already applied to this task"
        super().__init__("RecruitmentApplication", "candidate_id", candidate_id)


class RecruitmentApplicationInvalidTransition(DomainError):
    message_key = "candidateApplicationInvalidTransition"

    def __init__(self, from_key: str, to_key: str) -> None:
        self.template_vars = {"from": from_key, "to": to_key}
        self.fallback = f"Cannot move an application from '{from_key}' to '{to_key}'"
        super().__init__(self.fallback)


class RecruitmentApplicationInterviewRequired(DomainError):
    message_key = "candidateApplicationInterviewRequired"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Schedule an interview before moving to the interview stage"
        super().__init__(self.fallback)


class RecruitmentApplicationNoOpenings(DomainError):
    message_key = "candidateApplicationNoOpenings"

    def __init__(self, openings: int) -> None:
        self.template_vars = {"openings": openings}
        self.fallback = (
            f"This vacancy has {openings} opening(s); offer + hired are already full"
        )
        super().__init__(self.fallback)


class RecruitmentApplicationDeleteError(DeleteError):
    message_key = "candidateApplicationDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Application {name} cannot be deleted"
        DomainError.__init__(self, self.fallback)


class RecruitmentApplicationDeleteSuccess(DeleteSuccess):
    message_key = "candidateApplicationDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Application {name} removed"
        DomainSuccess.__init__(self, self.fallback)


class RecruitmentApplicationCreateSuccess(CreateSuccess):
    message_key = "candidateApplicationCreateSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Candidate applied to the task"
        DomainSuccess.__init__(self, self.fallback)


class RecruitmentApplicationStatusChangeSuccess(DomainSuccess):
    message_key = "candidateApplicationStatusChangeSuccess"

    def __init__(self, to_key: str) -> None:
        self.template_vars = {"to": to_key}
        self.fallback = f"Moved to '{to_key}'"
        DomainSuccess.__init__(self, self.fallback)
