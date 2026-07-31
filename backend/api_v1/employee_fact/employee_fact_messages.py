from backend.api_v1.base.errors import DomainError, NotFoundError
from backend.api_v1.base.success import DomainSuccess


class EmployeeFactNotFound(NotFoundError):
    message_key = "employeeFactNotFound"

    def __init__(self, fact_id: int) -> None:
        self.template_vars = {"factId": fact_id}
        self.fallback = f"Fact with ID {fact_id} not found"
        super().__init__("EmployeeFact", "id", fact_id)


class EmployeeFactEmployeeMismatch(DomainError):
    """The target competence belongs to a different employee's review. Moving a
    fact between people is never a legitimate operation — it would silently
    re-attribute authored content."""

    message_key = "employeeFactEmployeeMismatch"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "This fact belongs to a different employee"
        super().__init__(self.fallback)


class EmployeeFactNotEditable(DomainError):
    """Same rule the evaluation write path uses: a reviewed/closed record, or one
    in a closed session, is frozen. To the user it is one editable surface."""

    message_key = "evaluationNotEditable"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "This review is closed for editing"
        super().__init__(self.fallback)


class EmployeeFactSaveSuccess(DomainSuccess):
    message_key = "employeeFactSaveSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Fact saved"
        super().__init__(self.fallback)


class EmployeeFactDeleteSuccess(DomainSuccess):
    message_key = "employeeFactDeleteSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Fact deleted"
        super().__init__(self.fallback)
