from backend.api_v1.base.success import (
    CreateSuccess,
    DeleteSuccess,
    DomainSuccess,
    UpdateSuccess,
)


class TalentAuditJobCreateSuccess(CreateSuccess):
    message_key = "talentAuditJobCreateSuccess"

    def __init__(self, job_id: int) -> None:
        self.template_vars = {"jobId": job_id}
        self.fallback = f"Talent audit job with ID {job_id} successfully created"
        DomainSuccess.__init__(self, self.fallback)


class TalentAuditJobUpdateSuccess(UpdateSuccess):
    message_key = "talentAuditJobUpdateSuccess"

    def __init__(self, job_id: int) -> None:
        self.template_vars = {"jobId": job_id}
        self.fallback = f"Talent audit job with ID {job_id} successfully updated"
        DomainSuccess.__init__(self, self.fallback)


class TalentAuditJobDeleteSuccess(DeleteSuccess):
    message_key = "talentAuditJobDeleteSuccess"

    def __init__(self, job_id: int) -> None:
        self.template_vars = {"jobId": job_id}
        self.fallback = f"Talent audit job with ID {job_id} successfully deleted"
        DomainSuccess.__init__(self, self.fallback)
