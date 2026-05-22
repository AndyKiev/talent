from backend.api_v1.base.success import CreateSuccess, DeleteSuccess, DomainSuccess, UpdateSuccess


class TalentAuditInterviewCreateSuccess(CreateSuccess):
    message_key = "talentAuditInterviewCreateSuccess"

    def __init__(self, interview_id: int) -> None:
        self.template_vars = {"interviewId": interview_id}
        self.fallback = f"Talent audit interview with ID {interview_id} successfully created"
        DomainSuccess.__init__(self, self.fallback)


class TalentAuditInterviewUpdateSuccess(UpdateSuccess):
    message_key = "talentAuditInterviewUpdateSuccess"

    def __init__(self, interview_id: int) -> None:
        self.template_vars = {"interviewId": interview_id}
        self.fallback = f"Talent audit interview with ID {interview_id} successfully updated"
        DomainSuccess.__init__(self, self.fallback)


class TalentAuditInterviewDeleteSuccess(DeleteSuccess):
    message_key = "talentAuditInterviewDeleteSuccess"

    def __init__(self, interview_id: int) -> None:
        self.template_vars = {"interviewId": interview_id}
        self.fallback = f"Talent audit interview with ID {interview_id} successfully deleted"
        DomainSuccess.__init__(self, self.fallback)
