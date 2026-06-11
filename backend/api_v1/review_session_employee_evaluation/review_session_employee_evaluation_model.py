from typing import TYPE_CHECKING
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Text, Integer, ForeignKey, CheckConstraint
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin
from backend.api_v1.review_session_employee_evaluation.review_session_employee_evaluation_constants import (
    MAX_GRADE,
)

if TYPE_CHECKING:
    from backend.api_v1.review_session_employee.review_session_employee_model import (
        ReviewSessionEmployee,
    )
    from backend.api_v1.review_dimension.review_dimension_model import ReviewDimension


class ReviewSessionEmployeeEvaluation(IntIdPkMixin, TimestampMixin, Base):
    __tablename__ = "review_session_employee_evaluations"
    review_session_employee_id: Mapped[int] = mapped_column(
        ForeignKey("review_session_employees.id"), nullable=False
    )
    dimension_id: Mapped[int] = mapped_column(
        ForeignKey("review_dimensions.id"), nullable=False
    )
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    facts: Mapped[str | None] = mapped_column(Text, nullable=True)
    improvement: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint(
            f"score IS NULL OR (score >= 0 AND score <= {MAX_GRADE})",
            name="ck_score_range",
        ),
    )

    review_session_employee: Mapped["ReviewSessionEmployee"] = relationship(
        back_populates="evaluations",
        lazy="selectin",
    )
    dimension: Mapped["ReviewDimension"] = relationship(lazy="selectin")
