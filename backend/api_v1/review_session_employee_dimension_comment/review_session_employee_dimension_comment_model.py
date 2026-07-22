from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.review_session_employee_dimension.review_session_employee_dimension_model import (
        ReviewSessionEmployeeDimension,
    )


class ReviewSessionEmployeeDimensionComment(IntIdPkMixin, TimestampMixin, Base):
    """
    One comment line under a competence picked into a review summary.

    Was a nested string array inside the old `competence_summary` JSON blob on
    the review record. `sort_order`
    is not decoration: the UI numbers these lines (1., 2., 3. …), so the stored
    order is what the reader sees, and the TEMPO album renders them as bullets in
    the same order.

    CASCADE on the parent — removing a competence from a summary takes its
    comments with it, with no service code.
    """

    __tablename__ = "review_session_employee_dimension_comments"

    review_session_employee_dimension_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("review_session_employee_dimensions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    # Display order under its competence (0, 1, 2 … — the payload's array index).
    sort_order: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0", default=0
    )

    rse_dimension: Mapped["ReviewSessionEmployeeDimension"] = relationship(
        back_populates="comments"
    )

    def __repr__(self) -> str:
        return (
            f"<ReviewSessionEmployeeDimensionComment(id={self.id}, "
            f"review_session_employee_dimension_id={self.review_session_employee_dimension_id})>"
        )
