from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    DomainError,
    DeleteError,
)


class RegionNotFound(NotFoundError):
    message_key = "regionNotFound"

    def __init__(self, region_id: int) -> None:
        self.template_vars = {"regionId": region_id}
        self.fallback = f"Region with ID {region_id} not found"
        super().__init__("Region", "id", region_id)


class RegionNotFoundByName(NotFoundError):
    message_key = "regionNotFoundByName"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Region with name '{name}' not found"
        super().__init__("Region", "name", name)


class RegionNameTaken(AlreadyExistsError):
    message_key = "regionNameTaken"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Region with name '{name}' already exists"
        DomainError.__init__(self, self.fallback)


class RegionKeyTaken(AlreadyExistsError):
    message_key = "regionKeyTaken"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Region with key '{key}' already exists"
        DomainError.__init__(self, self.fallback)


class RegionDeleteError(DeleteError):
    message_key = "regionDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Region '{name}' cannot be deleted because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)


class RegionMoveError(DomainError):
    message_key = "regionMoveError"

    def __init__(self, operation: str, reason: str, region_id: int) -> None:
        self.template_vars = {
            "operation": operation,
            "reason": reason,
            "regionId": region_id,
        }
        self.fallback = f"Cannot move region {operation}: {reason}"
        super().__init__(self.fallback)
