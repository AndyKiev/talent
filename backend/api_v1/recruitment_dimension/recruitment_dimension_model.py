from typing import TYPE_CHECKING, List
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Text, Boolean, Integer
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.job_requirement_item.job_requirement_item_model import (
        JobRequirementItem,
    )


class RecruitmentDimension(IntIdPkMixin, TimestampMixin, Base):
    __tablename__ = "recruitment_dimensions"
    name: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    key: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    # Hex color (e.g. "#1565C0") used everywhere this dimension renders.
    color: Mapped[str] = mapped_column(String(7), nullable=False, default="#1565C0")
    # Display order across all lists; admins keep it in 10s (10, 20, 30...).
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    items: Mapped[List["JobRequirementItem"]] = relationship(
        back_populates="dimension",
        lazy="selectin",
    )
