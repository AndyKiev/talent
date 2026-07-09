from backend.api_v1.base.errors import DomainError
from backend.api_v1.base.success import DomainSuccess


class AccessTestNotAllowed(DomainError):
    message_key = "accessTestNotAllowed"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Only developers may enter access-testing mode"
        DomainError.__init__(self, self.fallback)


class AccessTestInvalidGroups(DomainError):
    message_key = "accessTestInvalidGroups"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Selected groups must be existing authorisation groups"
        DomainError.__init__(self, self.fallback)


class AccessTestEnterSuccess(DomainSuccess):
    message_key = "accessTestEntered"

    def __init__(self, groups: str) -> None:
        self.template_vars = {"groups": groups}
        self.fallback = f"Now testing access as: {groups}"
        DomainSuccess.__init__(self, self.fallback)


class AccessTestExitSuccess(DomainSuccess):
    message_key = "accessTestExited"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Exited access-testing mode"
        DomainSuccess.__init__(self, self.fallback)
