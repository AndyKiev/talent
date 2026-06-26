from typing import TYPE_CHECKING
from sqlalchemy import Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.job.job_model import Job
    from backend.api_v1.process_roles.process_role.process_role_model import ProcessRole


class JobProcessRoleLink(IntIdPkMixin, TimestampMixin, Base):
    """
    Association between a Job and a ProcessRole.

    Uniqueness is enforced at the DB level (job_id, process_role_id).
    """

    __table_args__ = (
        UniqueConstraint("job_id", "process_role_id", name="uq_job_process_role"),
    )

    job_id: Mapped[int] = mapped_column(Integer, ForeignKey("jobs.id"), nullable=False)
    process_role_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("process_roles.id"), nullable=False
    )

    # Relationships
    job: Mapped["Job"] = relationship(back_populates="process_role_links", lazy="selectin")
    process_role: Mapped["ProcessRole"] = relationship(lazy="selectin")

    def __repr__(self):
        return (
            f"<JobProcessRoleLink(job_id={self.job_id}, "
            f"process_role_id={self.process_role_id})>"
        )
