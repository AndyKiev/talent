import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.employee.employee_model import Employee
    from backend.api_v1.talent_audit.talent_audit_model import TalentAudit
    from backend.api_v1.talent_audit_interview_job.talent_audit_interview_job_model import (
        TalentAuditInterviewJob,
    )
    from backend.api_v1.talent_audit_interview_status.talent_audit_interview_status_model import (
        TalentAuditInterviewStatus,
    )


class TalentAuditInterview(IntIdPkMixin, Base):
    __tablename__ = "talent_audit_interview"

    talent_audit_id: Mapped[int] = mapped_column(
        ForeignKey("talent_audit.id", ondelete="RESTRICT"), nullable=False
    )
    status_id: Mapped[int] = mapped_column(
        ForeignKey("talent_audit_interview_statuses.id", ondelete="RESTRICT"),
        nullable=False,
    )
    interview_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    created_by: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationships
    talent_audit: Mapped["TalentAudit"] = relationship(
        back_populates="interviews",
        lazy="selectin",
    )
    status: Mapped["TalentAuditInterviewStatus"] = relationship(lazy="selectin")
    creator: Mapped["Employee"] = relationship(
        foreign_keys=[created_by],
        lazy="selectin",
    )
    interview_jobs: Mapped[list["TalentAuditInterviewJob"]] = relationship(
        back_populates="interview",
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return (
            f"<TalentAuditInterview("
            f"id={self.id}, "
            f"talent_audit_id={self.talent_audit_id}, "
            f"interview_date={self.interview_date})>"
        )
