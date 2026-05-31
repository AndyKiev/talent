from backend.api_v1.base.success import DomainSuccess, DeleteSuccess, CreateSuccess, UpdateSuccess


class ReviewSessionDeleteSuccess(DeleteSuccess):
    message_key = "reviewSessionDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Review session '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class ReviewSessionCreateSuccess(CreateSuccess):
    message_key = "reviewSessionCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Review session '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class ReviewSessionUpdateSuccess(UpdateSuccess):
    message_key = "reviewSessionUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Review session '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)


class ReviewSessionOpenSuccess(DomainSuccess):
    message_key = "reviewSessionOpenSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Review session '{name}' successfully opened"
        super().__init__(self.fallback)


class ReviewSessionCloseSuccess(DomainSuccess):
    message_key = "reviewSessionCloseSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Review session '{name}' successfully closed"
        super().__init__(self.fallback)


class ReviewSessionRevertSuccess(DomainSuccess):
    message_key = "reviewSessionRevertSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Review session '{name}' reverted to open"
        super().__init__(self.fallback)
