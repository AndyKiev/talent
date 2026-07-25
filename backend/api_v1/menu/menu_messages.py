from backend.api_v1.base.errors import (
    AlreadyExistsError,
    DeleteError,
    DomainError,
    NotFoundError,
)
from backend.api_v1.base.success import (
    CreateSuccess,
    DeleteSuccess,
    DomainSuccess,
    UpdateSuccess,
)


class MenuNotFound(NotFoundError):
    message_key = "menuNotFound"

    def __init__(self, menu_id: int) -> None:
        self.template_vars = {"menuId": menu_id}
        self.fallback = f"Menu with ID {menu_id} not found"
        super().__init__("Menu", "id", menu_id)


class MenuKeyTaken(AlreadyExistsError):
    message_key = "menuKeyTaken"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Menu with key '{key}' already exists"
        super().__init__("Menu", "key", key)


class MenuGroupsNotFound(DomainError):
    message_key = "menuGroupsNotFound"

    def __init__(self, group_ids) -> None:
        ids = ", ".join(str(g) for g in sorted(group_ids))
        self.template_vars = {"ids": ids}
        self.fallback = f"User group(s) not found: {ids}"
        DomainError.__init__(self, self.fallback)


class MenuParentInvalid(DomainError):
    message_key = "menuParentInvalid"

    def __init__(self, reason: str = "") -> None:
        self.template_vars = {"reason": reason}
        self.fallback = (
            f"Invalid parent menu: {reason}" if reason else "Invalid parent menu"
        )
        DomainError.__init__(self, self.fallback)


class MenuDeleteError(DeleteError):
    message_key = "menuDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Menu '{name}' cannot be deleted because it has sub-items "
            f"or is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)


class MenuCreateSuccess(CreateSuccess):
    message_key = "menuCreateSuccess"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Menu '{key}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class MenuUpdateSuccess(UpdateSuccess):
    message_key = "menuUpdateSuccess"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Menu '{key}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)


class MenuDeleteSuccess(DeleteSuccess):
    message_key = "menuDeleteSuccess"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Menu '{key}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)
