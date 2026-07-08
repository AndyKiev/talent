from backend.api_v1.base.errors import NotFoundError, DomainError


class EssenceSetNotFound(NotFoundError):
    message_key = "essenceSetNotFound"

    def __init__(self, identifier: int | str) -> None:
        self.template_vars = {"identifier": str(identifier)}
        self.fallback = f"Essence set '{identifier}' not found"
        super().__init__("EssenceSet", "id", identifier)


class EssenceSetInvalidMembers(DomainError):
    message_key = "essenceSetInvalidMembers"

    def __init__(self, missing_ids: set[int]) -> None:
        ids_str = ", ".join(str(i) for i in sorted(missing_ids))
        self.template_vars = {"ids": ids_str}
        self.fallback = (
            f"Cannot build essence set: essence id(s) {{{ids_str}}} do not exist"
        )
        super().__init__(self.fallback)
