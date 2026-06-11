from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


class PlanSessionCreateSuccess(CreateSuccess):
    message_key = "planSessionCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Plan session '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class PlanSessionUpdateSuccess(UpdateSuccess):
    message_key = "planSessionUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Plan session '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)


class PlanSessionDeleteSuccess(DeleteSuccess):
    message_key = "planSessionDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Plan session '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class PlanSessionOpenSuccess(DomainSuccess):
    message_key = "planSessionOpenSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Plan session '{name}' is now open"
        DomainSuccess.__init__(self, self.fallback)


class PlanSessionCloseSuccess(DomainSuccess):
    message_key = "planSessionCloseSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Plan session '{name}' is now closed"
        DomainSuccess.__init__(self, self.fallback)


class PlanSessionRevertSuccess(DomainSuccess):
    message_key = "planSessionRevertSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Plan session '{name}' reverted to open"
        DomainSuccess.__init__(self, self.fallback)


class PlanSessionResyncSuccess(DomainSuccess):
    message_key = "planSessionResyncSuccess"

    def __init__(self, name: str, added: int, reactivated: int, deactivated: int) -> None:
        self.template_vars = {
            "name": name,
            "added": added,
            "reactivated": reactivated,
            "deactivated": deactivated,
        }
        self.fallback = (
            f"Session '{name}' re-synced: {added} added, "
            f"{reactivated} reactivated, {deactivated} deactivated"
        )
        DomainSuccess.__init__(self, self.fallback)
