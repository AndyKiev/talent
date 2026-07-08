from backend.api_v1.base.success import DomainSuccess


class EmployeeLanguagesSaveSuccess(DomainSuccess):
    message_key = "employeeLanguagesSaveSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Foreign languages saved"
        super().__init__(self.fallback)
