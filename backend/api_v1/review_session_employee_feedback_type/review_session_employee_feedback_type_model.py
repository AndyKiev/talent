from typing import TYPE_CHECKING

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.review_session_employee_feedback.review_session_employee_feedback_model import (
        ReviewSessionEmployeeFeedback,
    )

# WHOSE feedback it is. Seeded; resolved BY KEY, never by id. The keys are a code
# contract because each side has its own editability rule (the employee writes
# their own, the manager writes theirs).
EMPLOYEE = "employee"
MANAGER = "manager"


class ReviewSessionEmployeeFeedbackType(IntIdPkMixin, TimestampMixin, Base):
    """
    Whose voice a piece of review feedback is: the employee's or the manager's.

    Replaces the two parallel nullable columns `employee_feedback` and
    `manager_feedback`. They were the same concept twice, so adding a third voice
    meant another column, another schema field and another autosave branch —
    whereas a row costs nothing.
    """

    __tablename__ = "review_session_employee_feedback_types"

    key: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    description: Mapped[str] = mapped_column(
        String(256), nullable=False, server_default="", default=""
    )
    sort_order: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0", default=0
    )

    feedbacks: Mapped[list["ReviewSessionEmployeeFeedback"]] = relationship(
        back_populates="feedback_type",
        lazy="noload",
    )

    def __repr__(self) -> str:
        return f"<ReviewSessionEmployeeFeedbackType(id={self.id}, key='{self.key}')>"
