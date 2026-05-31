from backend.api_v1.base.success import DomainSuccess


class ReviewSessionEmployeeStatusChangeSuccess(DomainSuccess):
    message_key = "reviewSessionEmployeeStatusChanged"

    def __init__(self, employee_name: str, new_status: str) -> None:
        self.template_vars = {"name": employee_name, "status": new_status}
        self.fallback = f"Review for '{employee_name}' changed to '{new_status}'"
        super().__init__(self.fallback)
