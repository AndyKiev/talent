from backend.api_v1.base.errors import NotFoundError, DomainError, DeleteError
from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


class RecruitmentTaskNotFound(NotFoundError):
    message_key = "recruitmentTaskNotFound"

    def __init__(self, task_id: int) -> None:
        self.template_vars = {"id": task_id}
        self.fallback = f"Recruitment task with ID {task_id} not found"
        super().__init__("RecruitmentTask", "id", task_id)


class RecruitmentTaskInvalidTransition(DomainError):
    message_key = "recruitmentTaskInvalidTransition"

    def __init__(self, from_status: str, to_status: str) -> None:
        self.template_vars = {"from": from_status, "to": to_status}
        self.fallback = f"Cannot move task from '{from_status}' to '{to_status}'"
        super().__init__(self.fallback)


class RecruitmentTaskRequirementGroupRequired(DomainError):
    message_key = "recruitmentTaskRequirementGroupRequired"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Link a requirement group before starting the task"
        super().__init__(self.fallback)


class RecruitmentTaskFulfillNeedsCandidate(DomainError):
    message_key = "recruitmentTaskFulfillNeedsCandidate"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "A task can only be fulfilled once a candidate is hired for it"
        super().__init__(self.fallback)


class RecruitmentTaskClosed(DomainError):
    message_key = "recruitmentTaskClosed"

    def __init__(self, task_id: int) -> None:
        self.template_vars = {"id": task_id}
        self.fallback = "Task is closed and cannot be edited"
        super().__init__(self.fallback)


class RecruitmentTaskDeleteError(DeleteError):
    message_key = "recruitmentTaskDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = "Only tasks in 'created' status can be deleted"
        DomainError.__init__(self, self.fallback)


class RecruitmentTaskDeleteSuccess(DeleteSuccess):
    message_key = "recruitmentTaskDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = "Recruitment task successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class RecruitmentTaskCreateSuccess(CreateSuccess):
    message_key = "recruitmentTaskCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Recruitment task for '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class RecruitmentTaskUpdateSuccess(UpdateSuccess):
    message_key = "recruitmentTaskUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = "Recruitment task successfully updated"
        DomainSuccess.__init__(self, self.fallback)


class RecruitmentTaskStatusChangeSuccess(UpdateSuccess):
    message_key = "recruitmentTaskStatusChangeSuccess"

    def __init__(self, status: str) -> None:
        self.template_vars = {"status": status}
        self.fallback = f"Status changed to '{status}'"
        DomainSuccess.__init__(self, self.fallback)
