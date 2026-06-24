# backend/api_v1/essence/essence_success.py
from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


class EssenceCreateSuccess(CreateSuccess):
    message_key = "essenceCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Essence '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class EssenceUpdateSuccess(UpdateSuccess):
    message_key = "essenceUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Essence '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)


class EssenceDeleteSuccess(DeleteSuccess):
    message_key = "essenceDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Essence '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)
