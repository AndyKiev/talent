from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.job.job_model import Job
    from backend.api_v1.job_group.job_group_model import JobGroup


class JobJobGroupLink(IntIdPkMixin, TimestampMixin, Base):
    """
    Association between a Job and a JobGroup.

    Uniqueness is enforced at the DB level (job_id, job_group_id).
    The singleton constraint (allow_multiple=False on JobGroupType) is enforced
    in the service layer before inserting.
    """

    __table_args__ = (
        UniqueConstraint("job_id", "job_group_id", name="uq_job_job_group"),
    )

    job_id: Mapped[int] = mapped_column(Integer, ForeignKey("jobs.id"), nullable=False)
    job_group_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("job_groups.id"), nullable=False
    )

    # Relationships
    job: Mapped["Job"] = relationship(back_populates="job_groups", lazy="selectin")
    job_group: Mapped["JobGroup"] = relationship(back_populates="jobs", lazy="selectin")

    def __repr__(self):
        return (
            f"<JobJobGroupLink(job_id={self.job_id}, job_group_id={self.job_group_id})>"
        )
