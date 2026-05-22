from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    DomainError,
    DeleteError,
)


class UserGroupTypeNotFound(NotFoundError):
    message_key = "userGroupTypeNotFound"

    def __init__(self, type_id: int) -> None:
        self.template_vars = {"typeId": type_id}
        self.fallback = f"User group type with ID {type_id} not found"
        super().__init__("UserGroupType", "id", type_id)


class UserGroupTypeNotFoundByName(NotFoundError):
    message_key = "userGroupTypeNotFoundByName"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"User group type with name '{name}' not found"
        super().__init__("UserGroupType", "name", name)


class UserGroupTypeNameTaken(AlreadyExistsError):
    message_key = "userGroupTypeNameTaken"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"User group type with name '{name}' already exists"
        super().__init__("UserGroupType", "name", name)

class UserGroupTypeDeleteError(DeleteError):  # was DomainError
    message_key = "userGroupTypeDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"User group type '{name}' cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)



# class UserGroupTypeDeleteError(DomainError):
#     message_key = "userGroupTypeDeleteError"
#
#     def __init__(self, name: str) -> None:
#         self.template_vars = {"name": name}
#         self.fallback = (
#             f"User group type '{name}' cannot be deleted "
#             f"because it is referenced by other records"
#         )
#         super().__init__(self.fallback)
