# backend/auth/permission_errors.py
from backend.api_v1.base.errors import DomainError


class PermissionDeniedSet(DomainError):
    """
    Raised when a user lacks a required set-grain permission.

    Routed through the standard message_key translation pipeline so the user
    sees the message in their language (ukr/eng), not the English fallback.
    """

    message_key = "permissionDeniedSet"

    def __init__(self, operation: str, essences: list[str]) -> None:
        # Stable ordering for the rendered message.
        essences_str = ", ".join(sorted(essences))
        self.template_vars = {
            "operation": operation,
            "essences": essences_str,
        }
        self.fallback = (
            f"Permission denied: '{operation}' on {{{essences_str}}} "
            f"is not granted to your groups."
        )
        super().__init__(self.fallback)
