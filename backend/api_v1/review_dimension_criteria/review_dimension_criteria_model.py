from typing import TYPE_CHECKING
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Text, Integer, ForeignKey
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

    dimension: Mapped["ReviewDimension"] = relationship(
        back_populates="criteria",
        lazy="selectin",
    )
