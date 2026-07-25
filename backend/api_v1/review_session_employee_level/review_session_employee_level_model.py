from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.review_level.review_level_model import ReviewLevel
    from backend.api_v1.review_session_employee_level_answer.review_session_employee_level_answer_model import (
        ReviewSessionEmployeeLevelAnswer,
    )


class ReviewSessionEmployeeLevel(IntIdPkMixin, TimestampMixin, Base):
    """The target ('proposed') level an employee registers for in a review.

    One row per review_session_employee (unique). Each linked answer holds the
    employee's numbered comments against a single requirement of that level.
    """

    __tablename__ = "review_session_employee_levels"
    review_session_employee_id: Mapped[int] = mapped_column(
        ForeignKey("review_session_employees.id"), nullable=False, unique=True
    )
    level_id: Mapped[int] = mapped_column(
        ForeignKey("review_levels.id"), nullable=False
    )
    # Lifecycle of the proposal itself: 'proposed' (default), 'validated', 'rejected'.
    # Independent of the employee's review status and the session status — it can
    # be changed at any time. server_default keeps the migration safe on existing rows.
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="proposed", server_default="proposed"
    )

    level: Mapped["ReviewLevel"] = relationship(lazy="selectin")
    answers: Mapped[list["ReviewSessionEmployeeLevelAnswer"]] = relationship(
        back_populates="registration",
        lazy="selectin",
        cascade="all, delete-orphan",
    )
