import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.employee.employee_model import Employee
    from backend.api_v1.talent_audit_interview.talent_audit_interview_model import TalentAuditInterview
    from backend.api_v1.talent_audit_job.talent_audit_job_model import TalentAuditJob
    from backend.api_v1.talent_status_period_link.talent_status_period_link_model import TalentStatusPeriodLink


class TalentAuditInterviewJob(IntIdPkMixin, Base):
    __tablename__ = "talent_audit_interview_job"
    __table_args__ = (
        UniqueConstraint(
            "talent_audit_interview_id",
            "talent_audit_job_id",
            name="uq_interview_job",
        ),
    )

    talent_audit_interview_id: Mapped[int] = mapped_column(
        ForeignKey("talent_audit_interview.id", ondelete="CASCADE"), nullable=False
    )
    talent_audit_job_id: Mapped[int] = mapped_column(
        ForeignKey("talent_audit_job.id", ondelete="RESTRICT"), nullable=False
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
    interview: Mapped["TalentAuditInterview"] = relationship(
        back_populates="interview_jobs",
        lazy="selectin",
    )
    talent_audit_job: Mapped["TalentAuditJob"] = relationship(
        back_populates="interview_jobs",
        lazy="selectin",
    )
    talent_status_period_link: Mapped["TalentStatusPeriodLink"] = relationship(
        lazy="selectin",
    )
    creator: Mapped["Employee"] = relationship(
        foreign_keys=[created_by],
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<TalentAuditInterviewJob("
            f"id={self.id}, "
            f"interview_id={self.talent_audit_interview_id}, "
            f"audit_job_id={self.talent_audit_job_id})>"
        )