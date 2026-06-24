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
    only while the review is open. The note's audience depends on the role it was
    written under, so `author_role` is frozen at creation and the read filter keys
    off it (see the service):
      - author_role 'oversight'  : public = subject + oversight reviewers (not supervisors)
      - author_role 'supervision': public       = supervisors + oversight reviewers (not subject)
                                   to_oversight = author + oversight reviewers only
                                                  (not the subject, not other supervisors)
      - visibility 'private'     : author only (either role)
    `visibility` is owner-editable any time the review is still open.
    """

    __tablename__ = "review_session_employee_comments"

    review_session_employee_id: Mapped[int] = mapped_column(
        ForeignKey("review_session_employees.id", ondelete="CASCADE"),
        nullable=False,
    )
    author_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    # Role the note was written under: 'oversight' (link_target 'employee') |
    # 'supervision' (link_target 'department'). Fixes the audience even if the
    # author later switches active mode.
    author_role: Mapped[str] = mapped_column(String(20), nullable=False)
    # 'private' (author only) | 'public' (role-dependent audience) |
    # 'to_oversight' (supervision-only: author + oversight reviewers). Default private.
    visibility: Mapped[str] = mapped_column(
        String(20), nullable=False, default="private", server_default="private"
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    # Stamped on edit so the UI can flag an edited note (TimestampMixin gives created_at only).
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True
    )

    author: Mapped["Employee"] = relationship(lazy="selectin")
