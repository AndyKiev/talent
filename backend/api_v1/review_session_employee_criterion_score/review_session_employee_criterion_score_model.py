from typing import TYPE_CHECKING
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, ForeignKey, CheckConstraint, UniqueConstraint
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin
from backend.api_v1.review_session_employee_evaluation.review_session_employee_evaluation_constants import (
    MAX_GRADE,
)

if TYPE_CHECKING:
    from backend.api_v1.review_session_employee_evaluation.review_session_employee_evaluation_model import (
        ReviewSessionEmployeeEvaluation,
    )


class ReviewSessionEmployeeCriterionScore(IntIdPkMixin, TimestampMixin, Base):
    """One star rating (1..MAX_GRADE) for a single behavioural descriptor
    (hint bullet, by index) of a competence, per employee review."""

    __tablename__ = "review_session_employee_criterion_scores"
    review_session_employee_evaluation_id: Mapped[int] = mapped_column(
        ForeignKey("review_session_employee_evaluations.id"), nullable=False
    )
    # 0-based index of the descriptor (bullet) within the competence hint.
    criterion_index: Mapped[int] = mapped_column(Integer, nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False)

    __table_args__ = (
        CheckConstraint(
            f"score >= 1 AND score <= {MAX_GRADE}",
            name="ck_criterion_score_range",
        ),
        UniqueConstraint(
            "review_session_employee_evaluation_id",
            "criterion_index",
            name="uq_criterion_score_eval_index",
        ),
    )

    evaluation: Mapped["ReviewSessionEmployeeEvaluation"] = relationship(
        back_populates="criterion_scores",
        lazy="selectin",
    )
