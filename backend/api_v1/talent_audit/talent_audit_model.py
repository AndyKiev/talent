from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.employee.employee_model import Employee
    from backend.api_v1.talent_audit_status.talent_audit_status_model import TalentAuditStatus
    from backend.api_v1.talent_audit_job.talent_audit_job_model import TalentAuditJob


class TalentAudit(IntIdPkMixin, Base):
    __tablename__ = "talent_audit"

    employee_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("employees.id", ondelete="RESTRICT"), nullable=False, unique=True
    )
    status_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("talent_audit_statuses.id", ondelete="RESTRICT"), nullable=False
    )
    created_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("employees.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationships
    employee: Mapped["Employee"] = relationship(
        foreign_keys=[employee_id],
        lazy="selectin",
    )
    status: Mapped["TalentAuditStatus"] = relationship(
        back_populates="talent_audits",
        lazy="selectin",
    )
    creator: Mapped["Employee"] = relationship(
        foreign_keys=[created_by],
        lazy="selectin",
    )
    jobs: Mapped[list["TalentAuditJob"]] = relationship(
        back_populates="talent_audit",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<TalentAudit(id={self.id}, "
            f"employee_id={self.employee_id}, "
            f"status_id={self.status_id})>"
        )
