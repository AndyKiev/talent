from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.review_dimension.review_dimension_model import ReviewDimension
    from backend.api_v1.review_session_employee_dimension_comment.review_session_employee_dimension_comment_model import (
        ReviewSessionEmployeeDimensionComment,
    )
    from backend.api_v1.review_session_employee_dimension_type.review_session_employee_dimension_type_model import (
        ReviewSessionEmployeeDimensionType,
    )


class ReviewSessionEmployeeDimension(IntIdPkMixin, TimestampMixin, Base):
    """
    One dimension singled out for one employee in one review, as a strength or
    as something to develop.

    Note the neighbour it is easily confused with:
    `review_session_employee_evaluations` is also (review record x dimension),
    but it holds the SCORE for EVERY dimension. This table holds only the few a
    reviewer highlighted, plus which side they were put on and the notes.

    Replaces an entry of the former
    `review_session_employees.competence_summary` JSON blob, which referenced the
    dimension by a free-text `dimension_key` and carried its comments as a
    nested array. The dimension is now a real FK into `review_dimensions`.

    Three things worth knowing:

    - **Uniqueness is on the TRIPLE** (rse, type, dimension), not on the pair.
      The candidate filters only exclude dimensions already picked on the SAME
      side, so one dimension may legitimately sit in both the strong and the
      to-develop list. A pair-unique constraint would reject a live case.
    - **`dimension_id` is RESTRICT, not CASCADE.** These rows record what a
      reviewer said about a person; deleting a dimension must not silently erase
      that. Retiring a dimension is done by DEACTIVATING it (`is_active`), which
      keeps every historical review intact. The FK does the blocking and
      `delete_review_dimension` turns the IntegrityError into a domain error
      that tells the user to deactivate instead. This is a deliberate divergence
      from `employee_mission_dimension_links`, which cascades — that link is an
      optional pointer, this is content.
    - **`sort_order` is load-bearing**: the cards are drag-reorderable inside
      their side and the stored order IS the displayed order.
    """

    __tablename__ = "review_session_employee_dimensions"
    __table_args__ = (
        UniqueConstraint(
            "review_session_employee_id",
            "review_session_employee_dimension_type_id",
            "dimension_id",
            name="uq_review_session_employee_dimension",
        ),
    )

    review_session_employee_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("review_session_employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    review_session_employee_dimension_type_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("review_session_employee_dimension_types.id"),
        nullable=False,
    )
    dimension_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("review_dimensions.id"),
        nullable=False,
    )
    # Display order inside its side (0, 1, 2 … — the payload's array index).
    sort_order: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0", default=0
    )

    dimension_type: Mapped["ReviewSessionEmployeeDimensionType"] = relationship(
        back_populates="rse_dimensions",
        lazy="selectin",
    )
    dimension: Mapped["ReviewDimension"] = relationship(lazy="selectin")
    comments: Mapped[list["ReviewSessionEmployeeDimensionComment"]] = relationship(
        back_populates="rse_dimension",
        lazy="selectin",
        order_by="ReviewSessionEmployeeDimensionComment.sort_order",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return (
            f"<ReviewSessionEmployeeDimension(id={self.id}, "
            f"rse_id={self.review_session_employee_id}, "
            f"type_id={self.review_session_employee_dimension_type_id}, "
            f"dimension_id={self.dimension_id})>"
        )
