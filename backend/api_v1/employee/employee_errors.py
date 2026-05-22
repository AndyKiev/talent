from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    RelationshipError,
    DomainError,
    DeleteError
)



# Shared group errors — message keys (groupNotFound, groupsNotFound) already in the DB.


# ---------------------------------------------------------------------------
# Each error carries:
#   - a message_key  → looked up in the DB by BaseService._translate()
#   - template_vars  → injected into the message template (e.g. ${employeeId})
#   - fallback       → plain-English string used when DB lookup fails
# ---------------------------------------------------------------------------


class EmployeeNotFound(NotFoundError):
    message_key = "employeeNotFound"

    def __init__(self, employee_id: int) -> None:
        self.template_vars = {"employeeId": employee_id}
        self.fallback = f"Employee with ID {employee_id} not found"
        super().__init__("Employee", "id", employee_id)


class EmployeeNotFoundByCode(NotFoundError):
    message_key = "employeeNotFoundByCode"

    def __init__(self, code: str) -> None:
        self.template_vars = {"code": code}
        self.fallback = f"Employee with code '{code}' not found"
        super().__init__("Employee", "code", code)


class EmployeeCodeTaken(AlreadyExistsError):
    message_key = "employeeCodeTaken"

    def __init__(self, code: str) -> None:
        self.template_vars = {"code": code}
        self.fallback = f"Employee with code '{code}' already exists"
        super().__init__("Employee", "code", code)


class EmployeeEmailTaken(AlreadyExistsError):
    message_key = "employeeEmailTaken"

    def __init__(self, email: str) -> None:
        self.template_vars = {"email": email}
        self.fallback = f"Employee with email '{email}' already exists"
        super().__init__("Employee", "email", email)


class EmployeeAlreadyInGroup(RelationshipError):
    message_key = "employeeAlreadyInGroup"

    def __init__(self, employee_code: str, group_name: str) -> None:
        self.template_vars = {"employeeCode": employee_code, "groupName": group_name}
        self.fallback = f"Employee '{employee_code}' is already in group '{group_name}'"
        super().__init__(self.fallback)


class UserNotInGroup(RelationshipError):
    message_key = "employeeNotInGroup"

    def __init__(self, employee_code: str, group_name: str) -> None:
        self.template_vars = {"employeeCode": employee_code, "groupName": group_name}
        self.fallback = f"Employee '{employee_code}' is not in group '{group_name}'"
        super().__init__(self.fallback)



class EmployeeDeleteError(DeleteError):
    message_key = "employeeDeleteError"
    def __init__(self, employee_code: str) -> None:
        self.template_vars = {"code": employee_code}
        self.fallback = f"Employee '{employee_code}' cannot be deleted because it is referenced by other records"
        DomainError.__init__(self, self.fallback)

# class UserGroupTypeDeleteError(DeleteError):  # was DomainError
#     message_key = "userGroupTypeDeleteError"
#
#     def __init__(self, name: str) -> None:
#         self.template_vars = {"name": name}
#         self.fallback = (
#             f"User group type '{name}' cannot be deleted "
#             f"because it is referenced by other records"
#         )
#         DomainError.__init__(self, self.fallback)