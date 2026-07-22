from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.review_session_employee.review_session_employee_model import (
        ReviewSessionEmployee,
    )
    from backend.api_v1.review_session_employee_feedback_type.review_session_employee_feedback_type_model import (
        ReviewSessionEmployeeFeedbackType,
    )


class ReviewSessionEmployeeFeedback(IntIdPkMixin, TimestampMixin, Base):
    """
    One piece of free-text feedback on a review, attributed to a voice
    (employee / manager) rather than to a column name.

    Replaces the nullable `employee_feedback` + `manager_feedback` pair on the
    review record. Two consequences worth knowing:

    - **UNIQUE (review_session_employee_id, feedback_type_id)** — at most one
      text per voice per review, which is exactly what the two columns enforced
      by existing at all. The write path upserts on that pair.
    - **Absence means "not written"**, so there is no nullable column: an empty
      box simply has no row. Deleting the row is how feedback is cleared, which
      also means the table never stores a meaningless empty string.
    """

    __tablename__ = "review_session_employee_feedbacks"
    __table_args__ = (
        UniqueConstraint(
            "review_session_employee_id",
            "review_session_employee_feedback_type_id",
            name="uq_review_session_employee_feedback",
        ),
    )

    review_session_employee_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("review_session_employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    review_session_employee_feedback_type_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("review_session_employee_feedback_types.id"),
        nullable=False,
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)

    review_session_employee: Mapped["ReviewSessionEmployee"] = relationship(
        back_populates="feedbacks"
    )
    feedback_type: Mapped["ReviewSessionEmployeeFeedbackType"] = relationship(
        back_populates="feedbacks",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<ReviewSessionEmployeeFeedback(id={self.id}, "
            f"rse_id={self.review_session_employee_id}, "
            f"type_id={self.review_session_employee_feedback_type_id})>"
        )
