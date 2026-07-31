from backend.api_v1.base.errors import (
    AlreadyExistsError,
    DeleteError,
    DomainError,
    NotFoundError,
    RelationshipError,
)
from backend.api_v1.base.success import DeleteSuccess, DomainSuccess

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


class EmployeeHasReferencesError(DomainError):
    """
    Raised when an employee cannot be deleted because other records still
    reference it. `summary` is a pre-translated, comma-separated list of
    blocking relationships with counts (built by the service).
    """

    message_key = "employeeHasReferencesError"

    def __init__(self, employee_code: str, summary: str) -> None:
        self.template_vars = {
            "code": employee_code,
            "blockers": summary,
        }
        self.fallback = (
            f"Employee '{employee_code}' cannot be deleted — still referenced by: "
            f"{summary}. Remove these first."
        )
        super().__init__(self.fallback)


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


class EmployeePersonRequired(DomainError):
    """An employee cannot exist without a person: the name parts live there and
    the display name is composed from them. Callers create the person first
    (POST /employees/with_activation and self-registration both do) and pass its
    id — there is no name string left to synthesize one from."""

    message_key = "employeePersonRequired"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "person_id is required: create the person first"
        super().__init__(self.fallback)


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


class EmployeeDeleteSuccess(DeleteSuccess):  # new
    message_key = "employeeDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Employee '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class MyLangUpdateSuccess(DomainSuccess):
    """Self-service language switch from the user menu."""

    message_key = "langUpdated"

    def __init__(self, lang_name: str) -> None:
        self.template_vars = {"lang": lang_name}
        self.fallback = f"Language changed to '{lang_name}'"
        super().__init__(self.fallback)
