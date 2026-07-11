from typing import TYPE_CHECKING, Optional
from datetime import datetime

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Text, ForeignKey, DateTime
from sqlalchemy.sql import func

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.employee.employee_model import Employee


class ReviewSessionEmployeeComment(IntIdPkMixin, TimestampMixin, Base):
    """A reviewer's note about one employee's review (many per rse).

    Authored only by an oversight/supervision reviewer (never the subject), and
    only while the review is open. Three visibility tiers per author role
    (full matrix: .claude/skills/review-comments/SKILL.md):
      - 'private'      : author only (either role)
      - 'to_subject'   : oversight-only scope — author + the reviewed employee
      - 'to_oversight' : supervision-only scope — author + oversight reviewers
                         (not the subject, not other supervisors)
      - 'public'       : everyone who can open the review (subject + oversight
                         reviewers + supervisors)
    `author_role` is frozen at creation so the allowed scopes stay stable even if
    the author later switches active mode. `visibility` is owner-editable any
    time the review is still open.
    """

    __tablename__ = "review_session_employee_comments"

    review_session_employee_id: Mapped[int] = mapped_column(
        ForeignKey("review_session_employees.id", ondelete="CASCADE"),
        nullable=False,
    )
    author_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    # Role the note was written under: 'oversight' (link_target 'employee') |
    # 'supervision' (link_target 'department'). Fixes the allowed scopes even if
    # the author later switches active mode.
    author_role: Mapped[str] = mapped_column(String(20), nullable=False)
    # 'private' (author only) | 'to_subject' (oversight-only: author + subject) |
    # 'to_oversight' (supervision-only: author + oversight reviewers) |
    # 'public' (everyone in the review). Default private.
    visibility: Mapped[str] = mapped_column(
        String(20), nullable=False, default="private", server_default="private"
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    # Stamped on edit so the UI can flag an edited note (TimestampMixin gives created_at only).
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True
    )

    author: Mapped["Employee"] = relationship(lazy="selectin")
