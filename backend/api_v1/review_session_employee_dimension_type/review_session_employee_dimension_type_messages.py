from backend.api_v1.base.errors import NotFoundError


class ReviewSessionEmployeeDimensionTypeNotFound(NotFoundError):
    message_key = "reviewSessionEmployeeDimensionTypeNotFound"

    def __init__(self, type_id: int) -> None:
        self.template_vars = {"typeId": type_id}
        self.fallback = (
            f"Dimension type (strong / to develop) with ID {type_id} not found"
        )
        super().__init__("ReviewSessionEmployeeDimensionType", "id", type_id)


class ReviewSessionEmployeeDimensionTypeKeyNotFound(NotFoundError):
    message_key = "reviewSessionEmployeeDimensionTypeKeyNotFound"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = (
            f"Dimension type '{key}' is missing — run the seed that creates "
            f"the 'strong' and 'develop' rows"
        )
        super().__init__("ReviewSessionEmployeeDimensionType", "key", key)
