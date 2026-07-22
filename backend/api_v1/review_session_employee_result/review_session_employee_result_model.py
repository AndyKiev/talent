from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.review_session_employee.review_session_employee_model import (
        ReviewSessionEmployee,
    )


class ReviewSessionEmployeeResult(IntIdPkMixin, TimestampMixin, Base):
    """
    One result / achievement the employee recorded for one review.

    Replaces a line of the former `review_session_employees.results_achievements`
    text column, which stored the whole list as one numbered blob
    ("1. ...\\n2. ...") and had to be split and renumbered on every read and
    write. The numbering was never data — it was a rendering of the position,
    which is now `sort_order`.

    Stays REVIEW-scoped (1:N off the review record), unlike the recommended
    trainings that moved to the employee: what someone achieved is said about a
    specific review period and must not follow them into the next one.
    """

    __tablename__ = "review_session_employee_results"

    review_session_employee_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("review_session_employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    # Display order (0, 1, 2 … — the payload's array index). The UI renders it
    # as "1.", "2." …, so this IS the number the reader sees.
    sort_order: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0", default=0
    )

    review_session_employee: Mapped["ReviewSessionEmployee"] = relationship(
        back_populates="results"
    )

    def __repr__(self) -> str:
        return (
            f"<ReviewSessionEmployeeResult(id={self.id}, "
            f"rse_id={self.review_session_employee_id}, "
            f"sort_order={self.sort_order})>"
        )
