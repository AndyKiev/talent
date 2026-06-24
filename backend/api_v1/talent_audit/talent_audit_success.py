from backend.api_v1.base.success import DomainSuccess, DeleteSuccess, CreateSuccess, UpdateSuccess


class TalentAuditCreateSuccess(CreateSuccess):
    message_key = "talentAuditCreateSuccess"

    def __init__(self, employee_id: int) -> None:
        self.template_vars = {"employeeId": employee_id}
        self.fallback = f"Talent audit for employee ID {employee_id} successfully created"
        DomainSuccess.__init__(self, self.fallback)


class TalentAuditUpdateSuccess(UpdateSuccess):
    message_key = "talentAuditUpdateSuccess"

    def __init__(self, audit_id: int) -> None:
        self.template_vars = {"auditId": audit_id}
        self.fallback = f"Talent audit with ID {audit_id} successfully updated"
        DomainSuccess.__init__(self, self.fallback)


class TalentAuditTalentPlusEnableSuccess(UpdateSuccess):
    message_key = "talentAuditTalentPlusEnableSuccess"

    def __init__(self, audit_id: int) -> None:
        self.template_vars = {"auditId": audit_id}
        self.fallback = f"Talent + enabled for audit ID {audit_id}"
        DomainSuccess.__init__(self, self.fallback)


class TalentAuditTalentPlusDisableSuccess(UpdateSuccess):
    message_key = "talentAuditTalentPlusDisableSuccess"

    def __init__(self, audit_id: int) -> None:
        self.template_vars = {"auditId": audit_id}
        self.fallback = f"Talent + disabled for audit ID {audit_id}"
        DomainSuccess.__init__(self, self.fallback)


class TalentAuditDeleteSuccess(DeleteSuccess):
    message_key = "talentAuditDeleteSuccess"

    def __init__(self, audit_id: int) -> None:
        self.template_vars = {"auditId": audit_id}
        self.fallback = f"Talent audit with ID {audit_id} successfully deleted"
        DomainSuccess.__init__(self, self.fallback)
