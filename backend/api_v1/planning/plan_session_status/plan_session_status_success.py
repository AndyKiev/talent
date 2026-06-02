from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


class PlanSessionStatusDeleteSuccess(DeleteSuccess):
    message_key = "planSessionStatusDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Plan session status '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class PlanSessionStatusCreateSuccess(CreateSuccess):
    message_key = "planSessionStatusCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Plan session status '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class PlanSessionStatusUpdateSuccess(UpdateSuccess):
    message_key = "planSessionStatusUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Plan session status '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
