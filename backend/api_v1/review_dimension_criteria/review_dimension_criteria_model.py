from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.review_dimension.review_dimension_model import ReviewDimension


class ReviewDimensionCriteria(IntIdPkMixin, TimestampMixin, Base):
    __tablename__ = "review_dimension_criterias"
    dimension_id: Mapped[int] = mapped_column(
        ForeignKey("review_dimensions.id"), nullable=False
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    # Only active criteria are frozen into a new session at open time. Inactive
    # ones stay in admin (sorted last) but never enter a fresh review.
    # server_default keeps the migration safe on existing rows (all become active).
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )

    dimension: Mapped["ReviewDimension"] = relationship(
        back_populates="criteria",
        lazy="selectin",
    )
