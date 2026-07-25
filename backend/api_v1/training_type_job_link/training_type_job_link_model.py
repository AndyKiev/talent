from typing import TYPE_CHECKING

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin
from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from backend.api_v1.job.job_model import Job
    from backend.api_v1.training_type.training_type_model import TrainingType


class TrainingTypeJobLink(IntIdPkMixin, TimestampMixin, Base):
    """
    Many-to-many association between a TrainingType (link type "by_job") and
    a Job. Uniqueness is on the *pair* — a training type can recommend
    multiple jobs, and a job can be recommended by multiple training types.
    """

    __table_args__ = (
        UniqueConstraint(
            "training_type_id", "job_id", name="uq_training_type_job"
        ),
    )

    training_type_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("training_types.id", ondelete="CASCADE"), nullable=False
    )
    job_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False
    )

    training_type: Mapped["TrainingType"] = relationship(
        back_populates="job_links", lazy="selectin"
    )
    job: Mapped["Job"] = relationship(
        back_populates="training_type_links", lazy="selectin"
    )

    def __repr__(self) -> str:
        return (
            f"<TrainingTypeJobLink(training_type_id={self.training_type_id}, "
            f"job_id={self.job_id})>"
        )
