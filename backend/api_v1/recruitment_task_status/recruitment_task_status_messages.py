from backend.api_v1.base.errors import NotFoundError


class RecruitmentTaskStatusNotFound(NotFoundError):
    message_key = "recruitmentTaskStatusNotFound"

    def __init__(self, status_id: int) -> None:
        self.template_vars = {"id": status_id}
        self.fallback = f"Recruitment task status with ID {status_id} not found"
        super().__init__("RecruitmentTaskStatus", "id", status_id)


class RecruitmentTaskStatusNotFoundByName(NotFoundError):
    message_key = "recruitmentTaskStatusNotFoundByName"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Recruitment task status '{name}' not found"
        super().__init__("RecruitmentTaskStatus", "name", name)
