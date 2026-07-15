from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.candidate_application.candidate_application_model import (
        CandidateApplication,
    )
    from backend.api_v1.employee.employee_model import Employee
    from backend.api_v1.pipeline_status.pipeline_status_model import PipelineStatus


class ApplicationStatusHistory(IntIdPkMixin, Base):
    """Append-only log: one row per pipeline-stage move of an application.

    Drives the candidate timeline (status steps + when + by whom).
    """

    __tablename__ = "application_status_history"

    application_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("candidate_applications.id", ondelete="CASCADE"),
        nullable=False,
    )
    status_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("pipeline_statuses.id", ondelete="RESTRICT"), nullable=False
    )
    changed_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("employees.id", ondelete="RESTRICT"), nullable=False
    )
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    application: Mapped["CandidateApplication"] = relationship(
        back_populates="status_history"
    )
    status: Mapped["PipelineStatus"] = relationship(lazy="selectin")
    changer: Mapped["Employee"] = relationship(
        foreign_keys=[changed_by], lazy="selectin"
    )

    def __repr__(self) -> str:
        return (
            f"<ApplicationStatusHistory(id={self.id}, "
            f"application_id={self.application_id}, status_id={self.status_id})>"
        )
