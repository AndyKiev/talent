from typing import TYPE_CHECKING
from sqlalchemy import Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.training_type.training_type_model import TrainingType
    from backend.api_v1.job_category.job_category_model import JobCategory


class TrainingTypeJobCategoryLink(IntIdPkMixin, TimestampMixin, Base):
    """
    Many-to-many association between a TrainingType (link type
    "by_job_category") and a JobCategory. Uniqueness is on the *pair* — a
    training type can require multiple job categories, and a job category can
    be required by multiple training types.
    """

    __table_args__ = (
        UniqueConstraint(
            "training_type_id", "job_category_id", name="uq_training_type_job_category"
        ),
    )

    training_type_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("training_types.id", ondelete="CASCADE"), nullable=False
    )
    job_category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("job_categories.id", ondelete="CASCADE"), nullable=False
    )

    training_type: Mapped["TrainingType"] = relationship(
        back_populates="job_category_links", lazy="selectin"
    )
    job_category: Mapped["JobCategory"] = relationship(
        back_populates="training_type_links", lazy="selectin"
    )

    def __repr__(self) -> str:
        return (
            f"<TrainingTypeJobCategoryLink(training_type_id={self.training_type_id}, "
            f"job_category_id={self.job_category_id})>"
        )
