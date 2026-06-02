from backend.api_v1.base.success import DomainSuccess, UpdateSuccess


class PlanScopeUpdateSuccess(UpdateSuccess):
    message_key = "planScopeUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Plan value for '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
