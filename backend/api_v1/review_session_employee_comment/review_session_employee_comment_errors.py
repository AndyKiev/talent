from backend.api_v1.base.errors import NotFoundError, DomainError


class ReviewCommentNotFound(NotFoundError):
    message_key = "reviewCommentNotFound"

    def __init__(self, comment_id: int) -> None:
        self.template_vars = {"typeId": comment_id}
        self.fallback = f"Comment {comment_id} not found"
        super().__init__("ReviewSessionEmployeeComment", "id", comment_id)


class ReviewCommentReviewNotOpen(DomainError):
    """Add / edit / delete is only allowed while BOTH the employee review and the
    session are open (a closed review or session freezes its notes)."""

    message_key = "reviewCommentReviewNotOpen"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Notes can be changed only while the review is open"
        super().__init__(self.fallback)


class ReviewCommentRoleRequired(DomainError):
    """Only an oversight/supervision reviewer of this employee may comment, and
    never on their own review."""

    message_key = "reviewCommentRoleRequired"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Only an oversight or supervision reviewer can add notes (never on yourself)"
        super().__init__(self.fallback)


class ReviewCommentNotOwner(DomainError):
    message_key = "reviewCommentNotOwner"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "You can only change your own notes"
        super().__init__(self.fallback)


class ReviewCommentInvalid(DomainError):
    """Empty body or an unknown visibility value."""

    message_key = "reviewCommentInvalid"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Invalid note (empty text or unknown visibility)"
        super().__init__(self.fallback)
