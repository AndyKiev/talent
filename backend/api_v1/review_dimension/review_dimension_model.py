from typing import TYPE_CHECKING, List
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Text, Boolean
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.review_dimension_criteria.review_dimension_criteria_model import (
        ReviewDimensionCriteria,
    )


class ReviewDimension(IntIdPkMixin, TimestampMixin, Base):
    __tablename__ = "review_dimensions"
    name: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    key: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    criteria: Mapped[List["ReviewDimensionCriteria"]] = relationship(
        back_populates="dimension",
        lazy="selectin",
    )
