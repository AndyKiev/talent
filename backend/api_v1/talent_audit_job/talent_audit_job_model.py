import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.employee.employee_model import Employee
    from backend.api_v1.job.job_model import Job
    from backend.api_v1.talent_audit.talent_audit_model import TalentAudit
    from backend.api_v1.talent_audit_interview_job.talent_audit_interview_job_model import (
        TalentAuditInterviewJob,
    )
    from backend.api_v1.talent_audit_job_status.talent_audit_job_status_model import (
        TalentAuditJobStatus,
    )
    from backend.api_v1.talent_status_period_link.talent_status_period_link_model import (
        TalentStatusPeriodLink,
    )


class TalentAuditJob(IntIdPkMixin, Base):
    __tablename__ = "talent_audit_job"

    talent_audit_id: Mapped[int] = mapped_column(
        ForeignKey("talent_audit.id", ondelete="RESTRICT"), nullable=False
    )
    target_job_id: Mapped[int] = mapped_column(
        ForeignKey("jobs.id", ondelete="RESTRICT"), nullable=False
    )
    status_id: Mapped[int] = mapped_column(
        ForeignKey("talent_audit_job_statuses.id", ondelete="RESTRICT"), nullable=False
    )
    talent_status_period_link_id: Mapped[int] = mapped_column(
        ForeignKey("talent_status_period_link.id", ondelete="RESTRICT"), nullable=False
    )
    created_by: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationships
    talent_audit: Mapped["TalentAudit"] = relationship(
        back_populates="jobs",
        lazy="selectin",
    )
    target_job: Mapped["Job"] = relationship(lazy="selectin")
    status: Mapped["TalentAuditJobStatus"] = relationship(lazy="selectin")
    talent_status_period_link: Mapped["TalentStatusPeriodLink"] = relationship(
        back_populates="talent_audit_jobs",
        lazy="selectin",
    )
    creator: Mapped["Employee"] = relationship(
        foreign_keys=[created_by],
        lazy="selectin",
    )
    interview_jobs: Mapped[list["TalentAuditInterviewJob"]] = relationship(
        back_populates="talent_audit_job",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<TalentAuditJob("
            f"id={self.id}, "
            f"talent_audit_id={self.talent_audit_id}, "
            f"target_job_id={self.target_job_id})>"
        )
