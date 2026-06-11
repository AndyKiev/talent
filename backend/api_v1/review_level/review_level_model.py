from typing import TYPE_CHECKING, List
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, Boolean
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.review_level_requirement.review_level_requirement_model import (
        ReviewLevelRequirement,
    )


class ReviewLevel(IntIdPkMixin, TimestampMixin, Base):
    __tablename__ = "review_levels"
    # Translation keys (resolved on the frontend via getString / messages DB).
    name_key: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    description_key: Mapped[str | None] = mapped_column(String(128), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    requirements: Mapped[List["ReviewLevelRequirement"]] = relationship(
        back_populates="level",
        lazy="selectin",
    )
