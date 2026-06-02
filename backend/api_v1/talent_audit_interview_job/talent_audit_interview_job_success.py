from backend.api_v1.base.success import DomainSuccess


class TalentAuditInterviewJobCreateSuccess(DomainSuccess):
    message_key = "talentAuditInterviewJobCreated"

    def __init__(self, record_id: int) -> None:
        self.template_vars = {"recordId": record_id}
        self.fallback = f"Talent audit interview job {record_id} created successfully"


class TalentAuditInterviewJobDeleteSuccess(DomainSuccess):
    message_key = "talentAuditInterviewJobDeleted"

    def __init__(self, record_id: int) -> None:
        self.template_vars = {"recordId": record_id}
        self.fallback = f"Talent audit interview job {record_id} deleted successfully"
