from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.recruitment_application.recruitment_application_model import (
        RecruitmentApplication,
    )
    from backend.api_v1.employee.employee_model import Employee
    from backend.api_v1.recruitment_application_status.recruitment_application_status_model import (
        RecruitmentApplicationStatus,
    )


class RecruitmentApplicationStatusChange(IntIdPkMixin, Base):
    """Append-only log: one row per pipeline-stage move of an application.

    Drives the candidate timeline (status steps + when + by whom).
    """

    __tablename__ = "recruitment_application_status_changes"

    application_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("recruitment_applications.id", ondelete="CASCADE"),
        nullable=False,
    )
    status_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("recruitment_application_statuses.id", ondelete="RESTRICT"),
        nullable=False,
    )
    created_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("employees.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    application: Mapped["RecruitmentApplication"] = relationship(
        back_populates="status_history"
    )
    status: Mapped["RecruitmentApplicationStatus"] = relationship(lazy="selectin")
    # NOLOAD: a full Employee eager-load drags its whole selectin graph. The
    # service fills the creator mini (id/name/code) via a column query.
    creator: Mapped["Employee"] = relationship(foreign_keys=[created_by], lazy="noload")

    def __repr__(self) -> str:
        return (
            f"<RecruitmentApplicationStatusChange(id={self.id}, "
            f"application_id={self.application_id}, status_id={self.status_id})>"
        )
