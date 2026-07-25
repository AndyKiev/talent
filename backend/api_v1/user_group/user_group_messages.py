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


class UserGroupNotFound(NotFoundError):
    message_key = "userGroupNotFound"

    def __init__(self, group_id: int) -> None:
        self.template_vars = {"groupId": group_id}
        self.fallback = f"User Group with ID {group_id} not found"
        super().__init__("User Group", "id", group_id)


class UserGroupsNotFound(NotFoundError):
    message_key = "userGroupsNotFound"

    def __init__(self, missing_group_ids: set[int]) -> None:
        self.template_vars = {"missingGroupIds": list(missing_group_ids)}
        self.fallback = (
            f"User Groups with IDs {', '.join(map(str, missing_group_ids))} not found"
        )
        super().__init__("User Groups", "ids", list(missing_group_ids))


class UserGroupNameTaken(AlreadyExistsError):
    message_key = "userGroupNameTaken"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"User Group with name '{name}' already exists"
        super().__init__("User Group", "name", name)


class UserGroupDeleteError(DeleteError):  # was DomainError
    message_key = "userGroupDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"User group '{name}' cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)  # skip DeleteError.__init__


class UserGroupDeleteSuccess(DeleteSuccess):
    message_key = "userGroupDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"User group '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class UserGroupCreateSuccess(CreateSuccess):
    message_key = "userGroupCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"User group '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class UserGroupUpdateSuccess(UpdateSuccess):
    message_key = "userGroupUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"User group '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
