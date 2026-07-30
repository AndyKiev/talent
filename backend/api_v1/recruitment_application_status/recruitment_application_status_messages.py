from backend.api_v1.base.errors import NotFoundError


class RecruitmentApplicationStatusNotFound(NotFoundError):
    message_key = "pipelineStatusNotFound"

    def __init__(self, status_id: int) -> None:
        self.template_vars = {"id": status_id}
        self.fallback = f"Pipeline status with ID {status_id} not found"
        super().__init__("RecruitmentApplicationStatus", "id", status_id)


class RecruitmentApplicationStatusNotFoundByName(NotFoundError):
    message_key = "pipelineStatusNotFoundByName"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Pipeline status '{name}' not found"
        super().__init__("RecruitmentApplicationStatus", "name", name)
