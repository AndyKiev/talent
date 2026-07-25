# backend/api_v1/training_category/training_category_model.py
from typing import TYPE_CHECKING

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from backend.api_v1.training_type.training_type_model import TrainingType


class TrainingCategory(IntIdPkMixin, TimestampMixin, Base):
    """
    User-managed grouping for training types (e.g. "School", "Courses").
    Unlike JobCategory, this carries a stored `name` — the set is created at
    runtime by users, not fixed/seeded, so there's no i18n key to resolve a
    label from.
    """

    __tablename__ = "training_categories"

    name: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    key: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(String(256), nullable=True)

    training_types: Mapped[list["TrainingType"]] = relationship(
        back_populates="training_category",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<TrainingCategory(id={self.id}, key='{self.key}')>"
