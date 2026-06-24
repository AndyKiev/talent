from typing import TYPE_CHECKING, List
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Text, Integer, Numeric, ForeignKey, CheckConstraint
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
    from backend.api_v1.review_session_employee_criterion_score.review_session_employee_criterion_score_model import (
        ReviewSessionEmployeeCriterionScore,
    )


class ReviewSessionEmployeeEvaluation(IntIdPkMixin, TimestampMixin, Base):
    __tablename__ = "review_session_employee_evaluations"
    review_session_employee_id: Mapped[int] = mapped_column(
        ForeignKey("review_session_employees.id"), nullable=False
    )
    dimension_id: Mapped[int] = mapped_column(
        ForeignKey("review_dimensions.id"), nullable=False
    )
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Fractional competence level = arithmetic mean of the per-descriptor
    # (hint bullet) star ratings. `score` keeps the rounded int for legacy
    # progress/analytics; `mean_score` holds the exact value used for the graph.
    mean_score: Mapped[float | None] = mapped_column(Numeric(3, 2), nullable=True)
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
    criterion_scores: Mapped[List["ReviewSessionEmployeeCriterionScore"]] = (
        relationship(
            back_populates="evaluation",
            lazy="selectin",
            cascade="all, delete-orphan",
        )
    )
