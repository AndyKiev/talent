from backend.api_v1.base.success import DomainSuccess, DeleteSuccess, CreateSuccess, UpdateSuccess


class RegionDeleteSuccess(DeleteSuccess):
    message_key = "regionDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Region '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class RegionCreateSuccess(CreateSuccess):
    message_key = "regionCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Region '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class RegionUpdateSuccess(UpdateSuccess):
    message_key = "regionUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Region '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)


class RegionMoveSuccess(UpdateSuccess):
    message_key = "regionMoveSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Region '{name}' successfully reordered"
        DomainSuccess.__init__(self, self.fallback)
