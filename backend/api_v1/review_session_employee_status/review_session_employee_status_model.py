from typing import TYPE_CHECKING

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.review_session_employee.review_session_employee_model import (
        ReviewSessionEmployee,
    )

# The three lifecycle keys. Rows are seeded and the DISPLAY name is translatable,
# but these keys are a CODE CONTRACT: the transition table, the editability rule
# and the frontend status machine (`rseStatus.ts`) all resolve BY KEY, never by
# id, so a reseed cannot break them. Do not rename them.
OPEN = "open"
REVIEWED = "reviewed"
CLOSED = "closed"


class ReviewSessionEmployeeStatus(IntIdPkMixin, TimestampMixin, Base):
    """
    Lifecycle status of ONE employee's review record: open -> reviewed -> closed
    (with revert/reopen edges backwards).

    Replaces the free-text `review_session_employees.status` varchar. Nothing
    stopped that column holding a typo, and the three legal values existed only
    as string literals scattered through the service. Mirrors the sibling
    `review_session_statuses`, which does the same job for the parent session.

    Note this is the RECORD's status, distinct from the SESSION's
    (pending/open/closed) — a review is editable only while BOTH are open.
    """

    __tablename__ = "review_session_employee_statuses"

    key: Mapped[str] = mapped_column(String(16), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    description: Mapped[str] = mapped_column(
        String(256), nullable=False, server_default="", default=""
    )
    sort_order: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0", default=0
    )

    review_session_employees: Mapped[list["ReviewSessionEmployee"]] = relationship(
        back_populates="status_rel",
        lazy="noload",
    )

    def __repr__(self) -> str:
        return f"<ReviewSessionEmployeeStatus(id={self.id}, key='{self.key}')>"
