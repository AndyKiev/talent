# backend/api_v1/essence_set/essence_set_errors.py
#
# Failures for the EssenceSet grain are intentionally few.
#
# Set *creation* cannot fail on uniqueness the way a normal essence can:
# get_or_create() resolves an already-existing set to its existing row by
# fingerprint. The only realistic failures are:
#   - looking up a set id that doesn't exist
#   - asking to build a set from essence ids that don't all exist
#
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
