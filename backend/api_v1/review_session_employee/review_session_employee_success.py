from backend.api_v1.base.success import DomainSuccess


class ReviewSessionEmployeeStatusChangeSuccess(DomainSuccess):
    message_key = "reviewSessionEmployeeStatusChanged"

    def __init__(self, employee_name: str, new_status: str) -> None:
        self.template_vars = {"name": employee_name, "status": new_status}
        self.fallback = f"Review for '{employee_name}' changed to '{new_status}'"
        super().__init__(self.fallback)


class ReviewSessionEmployeeAddedSuccess(DomainSuccess):
    message_key = "reviewSessionEmployeeAdded"

    def __init__(self, employee_name: str) -> None:
        self.template_vars = {"name": employee_name}
        self.fallback = f"'{employee_name}' added to the session"
        super().__init__(self.fallback)


class ReviewSessionEmployeeQueueOrderSuccess(DomainSuccess):
    message_key = "reviewSessionEmployeeQueueOrdered"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Presentation queue order saved"
        super().__init__(self.fallback)
