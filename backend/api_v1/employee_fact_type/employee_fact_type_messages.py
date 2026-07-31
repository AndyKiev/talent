from backend.api_v1.base.errors import NotFoundError


class EmployeeFactTypeNotFound(NotFoundError):
    message_key = "employeeFactTypeNotFound"

    def __init__(self, type_id: int) -> None:
        self.template_vars = {"typeId": type_id}
        self.fallback = f"Fact type (fact / improvement) with ID {type_id} not found"
        super().__init__("EmployeeFactType", "id", type_id)


class EmployeeFactTypeKeyNotFound(NotFoundError):
    message_key = "employeeFactTypeKeyNotFound"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = (
            f"Fact type '{key}' is missing — run the seed that creates the "
            f"'fact' and 'improvement' rows"
        )
        super().__init__("EmployeeFactType", "key", key)
