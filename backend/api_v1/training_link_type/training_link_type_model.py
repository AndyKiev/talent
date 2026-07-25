# backend/api_v1/training_link_type/training_link_type_model.py
from typing import TYPE_CHECKING

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from backend.api_v1.training_type.training_type_model import TrainingType


class TrainingLinkType(IntIdPkMixin, TimestampMixin, Base):
    """
    How a training type is targeted at employees: by_job_category, by_job, or
    everyone. Seeded, code-referenced (see TrainingTypeService.get_eligible_for_employee) —
    keys must stay stable.
    """

    __tablename__ = "training_link_types"

    key: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(String(256), nullable=True)

    training_types: Mapped[list["TrainingType"]] = relationship(
        back_populates="training_link_type",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<TrainingLinkType(id={self.id}, key='{self.key}')>"
