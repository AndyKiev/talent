from typing import TYPE_CHECKING
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, Boolean, ForeignKey
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.review_level.review_level_model import ReviewLevel


class ReviewLevelRequirement(IntIdPkMixin, TimestampMixin, Base):
    __tablename__ = "review_level_requirements"
    level_id: Mapped[int] = mapped_column(
        ForeignKey("review_levels.id"), nullable=False
    )
    # Translation key (resolved on the frontend via getString / messages DB).
    text_key: Mapped[str] = mapped_column(String(128), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    level: Mapped["ReviewLevel"] = relationship(
        back_populates="requirements",
        lazy="selectin",
    )
