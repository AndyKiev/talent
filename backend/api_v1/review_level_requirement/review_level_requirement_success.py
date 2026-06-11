from backend.api_v1.base.success import DomainSuccess, DeleteSuccess, CreateSuccess, UpdateSuccess


class ReviewLevelRequirementDeleteSuccess(DeleteSuccess):
    message_key = "reviewLevelRequirementDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Review level requirement '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class ReviewLevelRequirementCreateSuccess(CreateSuccess):
    message_key = "reviewLevelRequirementCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Review level requirement '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class ReviewLevelRequirementUpdateSuccess(UpdateSuccess):
    message_key = "reviewLevelRequirementUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Review level requirement '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
